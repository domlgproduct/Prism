import os
import logging
import boto3

logger = logging.getLogger(__name__)

def resolve_amplify_tables() -> dict:
    """
    Looks up physical DynamoDB table names published in SSM Parameter Store by AWS Amplify Gen 2.
    Returns a dictionary mapping model names to their actual DynamoDB table names in AWS:
    {
        "SourceDefinitionTable": "SourceDefinition-xxxx-dev",
        "SourceItemTable": "SourceItem-yyyy-dev"
    }
    """
    env = os.environ.get("ENVIRONMENT", "dev")
    app_name = os.environ.get("APP_NAME", "prism")
    
    # Base hierarchy path set by Amplify Gen 2
    ssm_prefix = f"/amplify/{app_name}/{env}/"
    logger.info(f"Resolving database table names from SSM Parameter Store path: {ssm_prefix}")
    
    resolved_tables = {}
    
    # List of models we need to resolve
    model_keys = [
        "SourceDefinition",
        "SourceItem",
        "KnowledgeItem",
        "Entity",
        "Relationship"
    ]
    
    try:
        ssm = boto3.client("ssm")
        
        paginator = ssm.get_paginator("get_parameters_by_path")
        pages = paginator.paginate(
            Path=ssm_prefix,
            Recursive=True,
            WithDecryption=True
        )
        
        for page in pages:
            for param in page.get("Parameters", []):
                name = param["Name"]
                val = param["Value"]
                
                # Check if param matches any of our models
                for model in model_keys:
                    if f"/data/{model}/tableName" in name or name.endswith(f"/{model}Table"):
                        resolved_tables[f"{model}Table"] = val
                        logger.info(f"Resolved SSM table for {model}: {val}")
                        
    except Exception as e:
        logger.warning(f"Could not fetch dynamic table names from AWS SSM Parameter Store: {str(e)}.")
        logger.info("Falling back to environment variables.")
        
    # Apply fallbacks from env variables if SSM resolution failed or was incomplete
    for model in model_keys:
        table_key = f"{model}Table"
        if table_key not in resolved_tables:
            env_var_name = f"{model.upper()}_TABLE"
            resolved_tables[table_key] = os.environ.get(env_var_name, os.environ.get(table_key, f"{model}-mock-table"))
            logger.info(f"Using table name fallback for {model}: {resolved_tables[table_key]}")
            
    return resolved_tables
