import os
import logging
import boto3

logger = logging.getLogger(__name__)

def resolve_amplify_tables() -> dict:
    """
    Looks up physical DynamoDB table names published in SSM Parameter Store by AWS Amplify Gen 2.
    If SSM parameters are missing, dynamically resolves the physical DynamoDB table names for the active environment.
    Returns a dictionary mapping model names to their actual DynamoDB table names in AWS:
    {
        "SourceDefinitionTable": "SourceDefinition-xxxx-NONE",
        "SourceItemTable": "SourceItem-yyyy-NONE"
    }
    """
    env = os.environ.get("ENVIRONMENT", "dev")
    app_name = os.environ.get("APP_NAME", "prism")
    
    # Base hierarchy path set by Amplify Gen 2 (for backward compatibility / parameter setups)
    ssm_prefix = f"/amplify/{app_name}/{env}/"
    logger.info(f"Resolving database table names from SSM Parameter Store path: {ssm_prefix}")
    
    resolved_tables = {}
    model_keys = [
        "SourceDefinition",
        "SourceItem",
        "KnowledgeItem",
        "Entity",
        "Relationship"
    ]
    
    # 1. Try to read from SSM path if configured
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
                for model in model_keys:
                    if f"/data/{model}/tableName" in name or name.endswith(f"/{model}Table"):
                        resolved_tables[f"{model}Table"] = val
                        logger.info(f"Resolved SSM table for {model}: {val}")
    except Exception as e:
        logger.warning(f"Could not fetch dynamic table names from AWS SSM Parameter Store: {str(e)}.")

    # 2. Try resolving via AppSync API List tags
    if not resolved_tables:
        try:
            appsync = boto3.client("appsync")
            apis = appsync.list_graphql_apis().get("graphqlApis", [])
            api_id = None
            for api in apis:
                tags = api.get("tags", {})
                if tags.get("amplify:branch-name") == env and api.get("name") == "amplifyData":
                    api_id = api.get("apiId")
                    logger.info(f"Matched AppSync API {api_id} for branch environment '{env}'")
                    break
            if api_id:
                for model in model_keys:
                    resolved_tables[f"{model}Table"] = f"{model}-{api_id}-NONE"
                    logger.info(f"Resolved table for {model} via AppSync ID: {resolved_tables[f'{model}Table']}")
        except Exception as e:
            logger.warning(f"Failed to resolve tables via AppSync API tags: {str(e)}")

    # 3. Try listing DynamoDB tables to match suffix
    if not resolved_tables:
        try:
            ddb = boto3.client("dynamodb")
            paginator = ddb.get_paginator("list_tables")
            pages = paginator.paginate()
            all_tables = []
            for page in pages:
                all_tables.extend(page.get("TableNames", []))
            
            suffix = None
            for table in all_tables:
                if table.startswith("SourceItem-"):
                    suffix = table[len("SourceItem-"):]
                    logger.info(f"Detected DynamoDB table suffix: {suffix}")
                    break
            
            if suffix:
                for model in model_keys:
                    resolved_tables[f"{model}Table"] = f"{model}-{suffix}"
        except Exception as e:
            logger.error(f"Failed to resolve tables via DynamoDB list: {str(e)}")
            
    # Apply fallbacks from env variables if all dynamic resolution failed
    for model in model_keys:
        table_key = f"{model}Table"
        if table_key not in resolved_tables:
            env_var_name = f"{model.upper()}_TABLE"
            resolved_tables[table_key] = os.environ.get(env_var_name, os.environ.get(table_key, f"{model}-mock-table"))
            logger.info(f"Using table name fallback for {model}: {resolved_tables[table_key]}")
            
    return resolved_tables
