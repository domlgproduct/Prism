import logging
from typing import Dict, Any
from listeners.base import BaseListener
from listeners.rss import RssListener
from listeners.html_scraper import HtmlScraperListener

logger = logging.getLogger(__name__)

class ListenerFactory:
    @staticmethod
    def get_listener(source: Dict[str, Any]) -> BaseListener:
        """
        Return the correct concrete BaseListener instance for the source's type.
        """
        source_type = source.get("sourceType")
        source_name = source.get("name", "Unknown")
        
        logger.info(f"Resolving listener for source: {source_name} (Type: {source_type})")
        
        if source_type == "RSS":
            return RssListener(source)
        elif source_type in ["INVESTOR_RELATIONS", "NEWS_SITE", "REGULATOR", "MANUAL"]:
            return HtmlScraperListener(source)
        else:
            logger.warning(f"Unsupported sourceType '{source_type}' for source '{source_name}'. Falling back to HtmlScraperListener.")
            return HtmlScraperListener(source)
