import logging
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
import boto3
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger(__name__)

class DynamoClient:
    def __init__(self, table_names: Dict[str, str]):
        self.tables = table_names
        self.db = boto3.resource("dynamodb")

    def get_pending_discovered_items(self) -> List[Dict[str, Any]]:
        """
        Scans for all SourceItems marked as newly 'DISCOVERED' to process via Bedrock.
        """
        table_name = self.tables.get("SourceItemTable")
        logger.info(f"Scanning for pending candidate items in table: {table_name}")
        
        pending_items = []
        try:
            table = self.db.Table(table_name)
            response = table.scan(
                FilterExpression=Attr("status").eq("DISCOVERED")
            )
            pending_items = response.get("Items", [])
            logger.info(f"Discovered {len(pending_items)} pending items awaiting Bedrock assessment.")
        except Exception as e:
            logger.error(f"Failed to scan SourceItems from table {table_name}: {str(e)}", exc_info=True)
            
        return pending_items

    def acquire_atomic_lock(self, item_id: str) -> bool:
        """
        Attempts to change status of SourceItem from 'DISCOVERED' to 'ASSESSING' atomically.
        If another execution thread is already working on this item, the conditional check fails,
        preventing duplicate Bedrock API requests.
        """
        table_name = self.tables.get("SourceItemTable")
        now_str = datetime.utcnow().isoformat() + "Z"
        try:
            table = self.db.Table(table_name)
            table.update_item(
                Key={"id": item_id},
                UpdateExpression="SET #s = :new_status, updatedAt = :now",
                ConditionExpression="#s = :expected_status",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":new_status": "ASSESSING",
                    ":expected_status": "DISCOVERED",
                    ":now": now_str
                }
            )
            logger.info(f"Successfully acquired atomic processing lock for SourceItem: {item_id}")
            return True
        except self.db.meta.client.exceptions.ConditionalCheckFailedException:
            logger.warning(f"Lock acquisition failed for SourceItem {item_id} (Already locked/processing). skipping.")
            return False
        except Exception as e:
            logger.error(f"Error locking SourceItem {item_id}: {str(e)}")
            return False

    def get_daily_processed_count(self) -> int:
        """
        Checks how many items have been processed today (status = ASSESSED) to trigger the circuit breaker.
        """
        table_name = self.tables.get("SourceItemTable")
        start_of_day = datetime.now(timezone.utc).date().isoformat() + "T00:00:00Z"
        
        try:
            table = self.db.Table(table_name)
            # Scan for items assessed today
            response = table.scan(
                FilterExpression=Attr("status").eq("ASSESSED") & Attr("updatedAt").gte(start_of_day),
                ProjectionExpression="id"
            )
            count = len(response.get("Items", []))
            logger.info(f"Daily AI assessment count: {count} items processed since {start_of_day}")
            return count
        except Exception as e:
            logger.warning(f"Failed to query daily processed count from table {table_name}: {str(e)}. Defaulting to 0.")
            return 0

    def save_assessment_results(self, item_id: str, assessment: Dict[str, Any], raw_output: str) -> str:
        """
        Creates a new draft KnowledgeItem in DynamoDB pre-seeded with Bedrock suggestions,
        and transitions the parent SourceItem status to 'ASSESSED', storing raw debug metrics.
        """
        ki_table_name = self.tables.get("KnowledgeItemTable")
        si_table_name = self.tables.get("SourceItemTable")
        
        now_str = datetime.utcnow().isoformat() + "Z"
        ki_id = str(uuid.uuid4())
        
        # 1. Map Bedrock results directly to KnowledgeItem schema
        ki_item = {
            "id": ki_id,
            "sourceItemId": item_id,
            "title": assessment.get("suggestedTitle", "New Curated Story"),
            "summary": assessment.get("summary", ""),
            "markdownBody": assessment.get("markdownDraft", ""),
            "whyItMatters": assessment.get("whyItMatters", ""),
            "keyFacts": assessment.get("keyFacts", []),
            "reliabilityScore": int(assessment.get("reliabilityScore", 3)),
            "significanceScore": int(assessment.get("significanceScore", 3)),
            "topics": assessment.get("suggestedTopics", []),
            "status": "DRAFT",
            "createdAt": now_str,
            "updatedAt": now_str,
            "createdBy": "SYSTEM-AI-Ingest"
        }
        
        try:
            # 2. Write KnowledgeItem Draft
            ki_table = self.db.Table(ki_table_name)
            ki_table.put_item(Item=ki_item)
            logger.info(f"Successfully drafted new KnowledgeItem (ID: {ki_id}) linked to SourceItem {item_id}")
            
            # 3. Transition parent SourceItem status to ASSESSED
            si_table = self.db.Table(si_table_name)
            si_table.update_item(
                Key={"id": item_id},
                UpdateExpression="SET #s = :status, rawAIOutput = :raw, aiAssessmentMetadata = :meta, updatedAt = :now",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":status": "ASSESSED",
                    ":raw": raw_output,
                    ":meta": json.dumps({
                        "assessmentTime": now_str,
                        "knowledgeItemId": ki_id,
                        "suggestedPrimaryEntity": assessment.get("suggestedPrimaryEntity"),
                        "suggestedRelatedEntities": assessment.get("suggestedRelatedEntities"),
                        "suggestedRelationships": assessment.get("suggestedRelationships")
                    }),
                    ":now": now_str
                }
            )
            logger.info(f"SourceItem {item_id} transitioned successfully to 'ASSESSED' status.")
            return ki_id
            
        except Exception as e:
            logger.error(f"Failed to save assessment results for item {item_id}: {str(e)}", exc_info=True)
            raise e

    def mark_as_failed(self, item_id: str, error_message: str):
        """
        Transitions the SourceItem status to 'FAILED' and logs the exception message.
        """
        table_name = self.tables.get("SourceItemTable")
        now_str = datetime.utcnow().isoformat() + "Z"
        try:
            table = self.db.Table(table_name)
            table.update_item(
                Key={"id": item_id},
                UpdateExpression="SET #s = :status, aiAssessmentMetadata = :meta, updatedAt = :now",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":status": "FAILED",
                    ":meta": json.dumps({"error": error_message, "failedAt": now_str}),
                    ":now": now_str
                }
            )
            logger.info(f"SourceItem {item_id} successfully marked as FAILED.")
        except Exception as e:
            logger.error(f"Failed to mark SourceItem {item_id} as FAILED: {str(e)}")
