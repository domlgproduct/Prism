from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseListener(ABC):
    def __init__(self, source_definition: Dict[str, Any]):
        """
        Initialize the listener with the DynamoDB source definition record.
        source_definition contains URL, name, defaultScoringHints, domainConfig, etc.
        """
        self.source = source_definition
        self.name = source_definition.get("name", "Unknown Source")
        self.url = source_definition.get("url", "")
        self.source_id = source_definition.get("id")

    @abstractmethod
    def fetch_candidates(self) -> List[Dict[str, Any]]:
        """
        Scan the source (RSS feed, site URL, press releases) and return candidate articles.
        Returns a list of raw dictionaries:
        [
            {
                "url": "https://example.com/news/123",
                "title": "Article Title",
                "content": "Full cleaned readable body text with HTML elements stripped.",
                "publicationDate": "2026-06-01T12:00:00Z"
            }
        ]
        """
        pass
