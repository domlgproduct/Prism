import os
import sys
import argparse
import json
import logging
import uuid
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Attr

# Configure basic logging to terminal stdout
logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(message)s")
logger = logging.getLogger("DatabaseSeeder")

def resolve_dynamodb_tables(env_name: str, app_name: str = "prism") -> dict:
    """
    Dynamically lists all DynamoDB tables in the AWS account and resolves
    the physical names matching the models for the PRISM app stack.
    """
    logger.info("Dynamically listing DynamoDB tables to resolve physical names...")
    resolved = {}
    model_keys = ["SourceDefinition", "SourceItem", "KnowledgeItem", "Entity", "Relationship"]
    
    try:
        ddb_client = boto3.client("dynamodb")
        paginator = ddb_client.get_paginator("list_tables")
        pages = paginator.paginate()
        
        all_tables = []
        for page in pages:
            all_tables.extend(page.get("TableNames", []))
            
        # Locate the unique suffix for our tables (e.g., pjobpc2nkvdv3dnnpjoyeoeate-NONE)
        # We find this by checking the suffix of any table starting with 'SourceItem-'
        suffix = None
        for table in all_tables:
            if table.startswith("SourceItem-"):
                # Suffix is everything after "SourceItem-"
                suffix = table[len("SourceItem-"):]
                logger.info(f"Detected PRISM table stack suffix: {suffix}")
                break
                
        if suffix:
            for model in model_keys:
                resolved[f"{model}Table"] = f"{model}-{suffix}"
                logger.info(f"Resolved table for {model}: {resolved[f'{model}Table']}")
        else:
            logger.warning("Could not find any tables starting with 'SourceItem-' in the DynamoDB list.")
            
    except Exception as e:
        logger.error(f"Error during dynamic table name resolution: {str(e)}")
        
    return resolved

def purge_table_items(db, table_name: str):
    """
    Deletes all items inside a specified table.
    """
    logger.info(f"Purging all existing records in table: {table_name}")
    table = db.Table(table_name)
    
    # Scan for all items (retrieving only key attributes)
    response = table.scan(ProjectionExpression="id")
    items = response.get("Items", [])
    
    while "LastEvaluatedKey" in response:
        response = table.scan(
            ProjectionExpression="id",
            ExclusiveStartKey=response["LastEvaluatedKey"]
        )
        items.extend(response.get("Items", []))
        
    if not items:
        logger.info(f"Table {table_name} is already empty.")
        return
        
    logger.info(f"Found {len(items)} items to delete.")
    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(Key={"id": item["id"]})
            
    logger.info(f"Successfully purged {len(items)} records from {table_name}.")

def run_seeder():
    parser = argparse.ArgumentParser(description="PRISM Sandbox Database Seeder Utility")
    parser.add_argument(
        "--env",
        type=str,
        default="dom",
        help="AWS Amplify Environment name (e.g. dev, prod, or developer identifier. Defaults to 'dom')"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Purge existing definitions in database before seeding new entries"
    )
    args = parser.parse_args()
    
    # 1. Resolve Dynamic tables
    tables = resolve_dynamodb_tables(args.env)
    logger.info(f"Targeting physical DynamoDB tables: {json.dumps(tables, indent=2)}")
    
    # Verify we are not targeting a mock table unintentionally
    for key, name in tables.items():
        if "mock-table" in name:
            logger.error(f"Table resolution failed for {key}. Check your AWS credentials or ensure you passed the correct environment via --env.")
            sys.exit(1)
            
    # Load seed JSON
    current_dir = os.path.dirname(os.path.abspath(__file__))
    seed_json_path = os.path.join(current_dir, "seed_data.json")
    
    logger.info(f"Loading seed dataset from: {seed_json_path}")
    with open(seed_json_path, "r", encoding="utf-8") as f:
        seed_data = json.load(f)
        
    db = boto3.resource("dynamodb")
    now_str = datetime.utcnow().isoformat() + "Z"
    
    # 2. Handle optional reset purge
    if args.reset:
        purge_table_items(db, tables["SourceDefinitionTable"])
        purge_table_items(db, tables["EntityTable"])
        purge_table_items(db, tables["RelationshipTable"])
        logger.info("Database purge completed.")
        
    # 3. Seed SourceDefinitions
    logger.info("Seeding SourceDefinitions...")
    sd_table = db.Table(tables["SourceDefinitionTable"])
    sd_count = 0
    
    for sd in seed_data["sourceDefinitions"]:
        item = {
            "id": str(uuid.uuid4()),
            "name": sd["name"],
            "sourceType": sd["sourceType"],
            "url": sd["url"],
            "active": sd["active"],
            "pollingConfig": sd.get("pollingConfig", "rate(1 hour)"),
            "domainConfig": sd.get("domainConfig", "{}"),
            "defaultScoringHints": sd.get("defaultScoringHints", "{}"),
            "tags": sd.get("tags", []),
            "createdAt": now_str,
            "updatedAt": now_str
        }
        sd_table.put_item(Item=item)
        sd_count += 1
        
    logger.info(f"Successfully seeded {sd_count} SourceDefinitions.")
    
    # 4. Seed Entities (saving mapping to resolve Relationship IDs)
    logger.info("Seeding Entities...")
    entity_table = db.Table(tables["EntityTable"])
    entity_name_to_id = {}
    entity_count = 0
    
    for ent in seed_data["entities"]:
        ent_id = str(uuid.uuid4())
        item = {
            "id": ent_id,
            "name": ent["name"],
            "slug": ent["slug"],
            "type": ent["type"],
            "description": ent.get("description", ""),
            "aliases": ent.get("aliases", []),
            "metadata": ent.get("metadata", "{}"),
            "active": ent.get("active", True),
            "createdAt": now_str,
            "updatedAt": now_str
        }
        entity_table.put_item(Item=item)
        entity_name_to_id[ent["name"]] = ent_id
        entity_count += 1
        
    logger.info(f"Successfully seeded {entity_count} Entities.")
    
    # 5. Seed Relationships (mapping dynamic Entity IDs)
    logger.info("Seeding Relationships...")
    rel_table = db.Table(tables["RelationshipTable"])
    rel_count = 0
    
    for rel in seed_data["relationships"]:
        source_name = rel["source"]
        target_name = rel["target"]
        
        source_id = entity_name_to_id.get(source_name)
        target_id = entity_name_to_id.get(target_name)
        
        if not source_id:
            logger.warning(f"Could not resolve source entity ID for '{source_name}'. Skipping relationship.")
            continue
        if not target_id:
            logger.warning(f"Could not resolve target entity ID for '{target_name}'. Skipping relationship.")
            continue
            
        item = {
            "id": str(uuid.uuid4()),
            "sourceEntityId": source_id,
            "targetEntityId": target_id,
            "relationshipType": rel["type"],
            "confidence": int(rel.get("confidence", 5)),
            "description": rel.get("description", ""),
            "supportingKnowledgeItems": [],
            "createdBy": "SYSTEM-Seed",
            "createdAt": now_str,
            "updatedAt": now_str
        }
        rel_table.put_item(Item=item)
        rel_count += 1
        
    logger.info(f"Successfully seeded {rel_count} Relationships.")
    
    logger.info("\n" + "="*50)
    logger.info("DATABASE SEEDING SUCCESSFUL!")
    logger.info(f"SourceDefinitions:  {sd_count}")
    logger.info(f"Entities:           {entity_count}")
    logger.info(f"Relationships:      {rel_count}")
    logger.info("="*50 + "\n")

if __name__ == "__main__":
    run_seeder()
