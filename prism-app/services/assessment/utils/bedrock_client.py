import os
import json
import logging
import boto3
from jinja2 import Template

logger = logging.getLogger(__name__)

class BedrockClient:
    def __init__(self, model_id: str = None):
        """
        Initialize the Bedrock client.
        """
        self.model_id = model_id or os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307")
        self.client = boto3.client("bedrock-runtime")
        logger.info(f"Initialized BedrockClient for model: {self.model_id}")

    def run_article_assessment(self, title: str, content: str) -> dict:
        """
        Loads the assessment prompt, renders it with Jinja2, invokes Bedrock,
        and returns the sanitized, parsed JSON response.
        """
        # 1. Resolve prompt template relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_path = os.path.join(current_dir, "..", "prompts", "article_assessment_v1.md")
        
        logger.info(f"Loading Bedrock prompt template from: {prompt_path}")
        with open(prompt_path, "r", encoding="utf-8") as f:
            template_text = f.read()
            
        # 2. Render prompt using Jinja2
        template = Template(template_text)
        rendered_prompt = template.render(title=title, source_text=content)
        
        # 3. Assemble Claude Messages Payload (Bedrock V3 API format)
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1200,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": rendered_prompt
                        }
                    ]
                }
            ],
            "temperature": 0.1  # Low temperature for highly deterministic, structured JSON
        }
        
        # 4. Invoke Amazon Bedrock Runtime
        logger.info(f"Invoking Bedrock model '{self.model_id}' (Length: {len(rendered_prompt)} chars)")
        
        response = self.client.invoke_model(
            modelId=self.model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body)
        )
        
        # 5. Extract and parse Claude response
        response_body = json.loads(response.get("body").read())
        raw_output_text = response_body["content"][0]["text"]
        
        logger.info(f"Bedrock returned raw text response (Length: {len(raw_output_text)} chars)")
        
        # 6. Sanitize and parse JSON
        parsed_json = self._sanitize_and_parse_json(raw_output_text)
        return parsed_json

    def _sanitize_and_parse_json(self, text: str) -> dict:
        """
        Cleans up raw Claude output text to locate and parse the JSON block.
        Gracefully strips out markdown block qualifiers (e.g. ```json) or leading/trailing comments.
        """
        cleaned = text.strip()
        
        # Strip markdown wrapper blocks if Claude ignored prompt guidelines
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
            
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
            
        cleaned = cleaned.strip()
        
        # Find first '{' and last '}' to extract raw JSON block in case of conversational preambles
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        
        if start_idx == -1 or end_idx == -1:
            raise ValueError(f"Could not locate JSON boundaries '{str(start_idx)}' and '{str(end_idx)}' inside raw output: {text}")
            
        json_substring = cleaned[start_idx:end_idx + 1]
        
        try:
            return json.loads(json_substring)
        except json.JSONDecodeError as jde:
            logger.error(f"JSONDecodeError occurred on substring: {json_substring}")
            raise jde
