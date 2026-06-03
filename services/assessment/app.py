import os
import json
import logging
import boto3
from utils.ssm import resolve_amplify_tables
from utils.db import DynamoClient
from utils.bedrock_client import BedrockClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def lambda_handler(event, context):
    """
    Periodic orchestrator stream processor sweep.
    Enforces concurrency and cost-cap limits, resolves Dynamic table models,
    calls Bedrock Claude, and drafts curated KnowledgeItems in DynamoDB.
    """
    logger.info("Executing periodic PRISM Bedrock AI Ingestion Assessment Sweep...")
    
    # 1. Resolve Dynamic Table configurations
    table_names = resolve_amplify_tables()
    db_client = DynamoClient(table_names)
    
    # 2. Resolve Dynamic cost parameters
    daily_cap = int(os.environ.get("DAILY_AI_LIMIT", 150))
    sns_topic_arn = os.environ.get("ALERTS_SNS_TOPIC_ARN")
    env = os.environ.get("ENVIRONMENT", "dev")
    
    # 3. Pull list of newly 'DISCOVERED' candidate articles
    pending_candidates = db_client.get_pending_discovered_items()
    logger.info(f"Discovered {len(pending_candidates)} pending raw candidates ready for AI assessment.")
    
    if not pending_candidates:
        logger.info("No pending candidates found. Halting sweep.")
        return {
            "statusCode": 200,
            "body": json.dumps({"status": "SUCCESS", "message": "No items to process"})
        }

    # 4. Check Daily volume circuit breaker prior to Bedrock calls
    daily_count = db_client.get_daily_processed_count()
    if daily_count >= daily_cap:
        logger.warning(f"AI Ingestion daily cap reached ({daily_count}/{daily_cap}). Circuit breaker tripped! Halting run.")
        trigger_sns_alert(sns_topic_arn, daily_count, daily_cap, env)
        
        # Mark all pending items as FAILED with limit error to notify reviewer
        for item in pending_candidates:
            db_client.mark_as_failed(item["id"], f"Daily AI Ingestion cap of {daily_cap} exceeded. Runway cost circuit breaker tripped.")
            
        return {
            "statusCode": 200,
            "body": json.dumps({"status": "CIRCUIT_BREAKER_TRIPPED", "processedCount": daily_count})
        }

    bedrock_client = BedrockClient()
    processed_count = 0
    failure_count = 0

    # 5. Process candidates sequentially (throttled concurrency)
    for candidate in pending_candidates:
        item_id = candidate["id"]
        title = candidate.get("title", "Untitled Source")
        content = candidate.get("content", "")
        
        # Double-check limit inside loop to prevent runaway within a single batch
        if daily_count + processed_count >= daily_cap:
            logger.warning("Daily AI volume limit reached during processing batch! Tripping circuit breaker inside loop.")
            trigger_sns_alert(sns_topic_arn, daily_count + processed_count, daily_cap, env)
            db_client.mark_as_failed(item_id, f"Daily AI Ingestion cap of {daily_cap} exceeded. Runway cost circuit breaker tripped.")
            continue
            
        # 6. Acquire atomic record lock before Bedrock invocation
        if not db_client.acquire_atomic_lock(item_id):
            # Skip if already locked by another thread
            continue
            
        try:
            logger.info(f"Invoking Bedrock assessment for candidate: '{title}' (ID: {item_id})")
            
            # 7. Invoke Bedrock Claude Model
            assessment_json = bedrock_client.run_article_assessment(title, content)
            
            # 8. Save structured results and transition parent status to 'ASSESSED'
            db_client.save_assessment_results(item_id, assessment_json, json.dumps(assessment_json))
            processed_count += 1
            
        except Exception as e:
            logger.error(f"Failed Bedrock AI Ingest processing for SourceItem {item_id}: {str(e)}", exc_info=True)
            db_client.mark_as_failed(item_id, str(e))
            failure_count += 1

    report = {
        "status": "SUCCESS" if failure_count == 0 else "PARTIAL_FAILURES",
        "processedCount": processed_count,
        "failureCount": failure_count,
        "limitChecked": daily_count + processed_count
    }
    logger.info(f"Bedrock AI Ingest run completed: {json.dumps(report)}")
    
    return {
        "statusCode": 200,
        "body": json.dumps(report)
    }

def trigger_sns_alert(sns_topic_arn: str, current_count: int, daily_cap: int, environment: str):
    """
    Publishes an immediate email notification alert to AWS SNS topic when the limit is breached.
    """
    if not sns_topic_arn:
        logger.warning("AWS SNS Alerting ARN is missing from Lambda environment variables. Alert not sent.")
        return
        
    try:
        sns = boto3.client("sns")
        subject = f"[PRISM ALERT] AI Ingestion Daily Limit Exceeded ({environment})"
        message = (
            f"ALERT: The daily AI assessment budget cap has been breached in your PRISM system.\n\n"
            f"Details:\n"
            f"--------------------------------------------------\n"
            f"Environment:       {environment}\n"
            f"Daily Limit Cap:   {daily_cap} articles / day\n"
            f"Attempted Volume:  {current_count} articles\n"
            f"Status:            Circuit Breaker Tripped - Ingestion Halted\n"
            f"--------------------------------------------------\n\n"
            f"All pending and newly ingested articles will be temporarily marked as FAILED with a limit "
            f"error message to prevent runaway Claude billing costs.\n\n"
            f"Action Required:\n"
            f"- To resume, increase the DailyAiLimit Parameter in your AWS CloudFormation / SAM deployment configuration."
        )
        
        logger.info(f"Publishing Daily AI Limit Alert to SNS Topic: {sns_topic_arn}")
        sns.publish(
            TopicArn=sns_topic_arn,
            Subject=subject,
            Message=message
        )
        logger.info("SNS Email Alert published successfully.")
    except Exception as e:
        logger.error(f"Failed to publish billing alert message to AWS SNS: {str(e)}")
