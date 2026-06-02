import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any
import boto3
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger(__name__)

class DynamoClient:
    def __init__(self, table_names: Dict[str, str]):
        """
        Initialize with a dictionary of physical table names resolved from SSM.
        """
        self.tables = table_names
        self.db = boto3.resource("dynamodb")

    def get_active_source_definitions(self) -> List[Dict[str, Any]]:
        """
        Queries DynamoDB to return all monitored SourceDefinitions marked as active.
        """
        table_name = self.tables.get("SourceDefinitionTable")
        logger.info(f"Scanning for active source definitions in table: {table_name}")
        
        active_sources = []
        try:
            table = self.db.Table(table_name)
            # Scan active source definitions
            response = table.scan(
                FilterExpression=Attr("active").eq(True)
            )
            active_sources = response.get("Items", [])
            
            # Handle pagination if dataset grows large
            while "LastEvaluatedKey" in response:
                response = table.scan(
                    FilterExpression=Attr("active").eq(True),
                    ExclusiveStartKey=response["LastEvaluatedKey"]
                )
                active_sources.extend(response.get("Items", []))
                
            logger.info(f"Discovered {len(active_sources)} active source definitions.")
            
        except Exception as e:
            logger.error(f"Failed to scan SourceDefinitions from table {table_name}: {str(e)}", exc_info=True)
            
        return active_sources

    def check_duplicate_exists(self, url: str) -> bool:
        """
        Scrapes the SourceItem table to check if this candidate article has already been ingested.
        This provides lightweight URL-based deduplication before writing raw contents.
        """
        table_name = self.tables.get("SourceItemTable")
        try:
            table = self.db.Table(table_name)
            # Scan for matching URL
            response = table.scan(
                FilterExpression=Attr("url").eq(url),
                ProjectionExpression="id, url"  # Projection for lightweight payload
            )
            items = response.get("Items", [])
            if items:
                logger.info(f"Duplicate found for URL: {url} (ID: {items[0]['id']})")
                return True
                
        except Exception as e:
            logger.warning(f"Deduplication check failed for URL {url} in table {table_name}: {str(e)}")
            
        return False

    def save_source_item(self, candidate: Dict[str, Any]) -> str:
        """
        Saves a new raw ingestion candidate as a SourceItem record in DynamoDB.
        Status is initialized as 'DISCOVERED' to signal availability for Bedrock AI processing.
        """
        table_name = self.tables.get("SourceItemTable")
        item_id = str(uuid.uuid4())
        now_str = datetime.utcnow().isoformat() + "Z"
        
        db_item = {
            "id": item_id,
            "url": candidate["url"],
            "title": candidate["title"],
            "content": candidate["content"],
            "publicationDate": candidate.get("publicationDate", now_str),
            "status": "DISCOVERED",
            "sourceDefinitionId": candidate.get("sourceDefinitionId"),
            "createdAt": now_str,
            "updatedAt": now_str,
            # Placeholder/Empty fields required by the GraphQL Schema type check validation
            "reviewer": None,
            "reviewTimestamp": None,
            "duplicateReferences": [],
            "rawAIOutput": None,
            "aiAssessmentMetadata": None
        }
        
        try:
            table = self.db.Table(table_name)
            table.put_item(Item=db_item)
            logger.info(f"Successfully saved new SourceItem: '{candidate['title']}' (ID: {item_id})")
            return item_id
        except Exception as e:
            logger.error(f"Failed to write SourceItem to table {table_name}: {str(e)}", exc_info=True)
            raise e
