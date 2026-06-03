import logging
import json
from utils.ssm import resolve_amplify_tables
from utils.db import DynamoClient
from listeners.factory import ListenerFactory

# Initialize elegant structured logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def lambda_handler(event, context):
    """
    Main Lambda orchestrator entrypoint.
    Triggered periodically by EventBridge Scheduler to scan feeds,
    extract raw article bodies, and store candidates securely.
    """
    logger.info("Executing periodic PRISM Source Ingestion Sweep...")
    
    # 1. Dynamically resolve table names based on stack environment
    table_names = resolve_amplify_tables()
    
    # 2. Instantiate our DynamoDB client wrapper
    db_client = DynamoClient(table_names)
    
    # 3. Retrieve all active monitored sources
    active_sources = db_client.get_active_source_definitions()
    logger.info(f"Retrieved {len(active_sources)} active source definitions for ingestion.")
    
    ingestion_count = 0
    duplicate_count = 0
    failure_count = 0
    
    # 4. Process each monitored source definitions record
    for source in active_sources:
        source_name = source.get("name", "Unnamed Source")
        try:
            # Dispatch to appropriate abstract listener class (RSS/HTML)
            listener = ListenerFactory.get_listener(source)
            candidates = listener.fetch_candidates()
            
            logger.info(f"Source '{source_name}' returned {len(candidates)} candidate articles.")
            
            for candidate in candidates:
                url = candidate["url"]
                
                # Check for duplicate URLs to maintain low-cost and database clean-up
                if db_client.check_duplicate_exists(url):
                    duplicate_count += 1
                    continue
                
                # Save as DISCOVERED raw candidate material
                db_client.save_source_item(candidate)
                ingestion_count += 1
                
        except Exception as e:
            logger.error(f"Ingestion failed for source '{source_name}': {str(e)}", exc_info=True)
            failure_count += 1
            
    # 5. Compile structured execution report
    report = {
        "status": "SUCCESS" if failure_count == 0 else "PARTIAL_SUCCESS",
        "activeSourcesProcessed": len(active_sources),
        "newlyIngestedItems": ingestion_count,
        "duplicatesSkipped": duplicate_count,
        "sourceFailures": failure_count
    }
    
    logger.info(f"Ingestion sweep completed: {json.dumps(report)}")
    
    return {
        "statusCode": 200,
        "body": json.dumps(report)
    }
