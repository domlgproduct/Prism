import logging
import feedparser
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from datetime import datetime
from listeners.base import BaseListener

logger = logging.getLogger(__name__)

class RssListener(BaseListener):
    def fetch_candidates(self) -> List[Dict[str, Any]]:
        """
        Parses the RSS feed URL. For each feed item, it downloads the direct article URL
        and extracts the full clean text to assemble the candidate SourceItem.
        """
        logger.info(f"Starting RSS fetch for feed: {self.name} ({self.url})")
        candidates = []
        
        try:
            # Parse the RSS feed metadata
            feed = feedparser.parse(self.url)
            if feed.bozo:
                logger.warning(f"Possible non-fatal feed parser parsing issue for feed {self.name}: {feed.bozo_exception}")
                
            entries = feed.entries
            logger.info(f"Discovered {len(entries)} entries in RSS feed {self.name}")
            
            # Fetch up to 10 latest entries to keep runtime and cost controlled in local development
            for entry in entries[:10]:
                link = entry.get("link")
                title = entry.get("title", "Untitled Post")
                
                if not link:
                    logger.warning(f"Feed entry in '{self.name}' is missing a direct link URL. Skipping.")
                    continue
                
                # Resolve publication date
                pub_date_str = None
                published_parsed = entry.get("published_parsed")
                if published_parsed:
                    try:
                        pub_date_str = datetime(*published_parsed[:6]).isoformat() + "Z"
                    except Exception:
                        pass
                if not pub_date_str:
                    pub_date_str = datetime.utcnow().isoformat() + "Z"
                
                logger.info(f"Ingesting RSS post: '{title}' (URL: {link})")
                
                # Fetch full article text
                content_text = self._extract_article_body(link)
                
                # Fallback to feed summary if page extraction completely fails
                if not content_text:
                    summary = entry.get("summary", "")
                    content_text = BeautifulSoup(summary, "html.parser").get_text()
                    logger.info("Fallback to RSS feed description summary for content.")
                
                candidates.append({
                    "url": link,
                    "title": title,
                    "content": content_text,
                    "publicationDate": pub_date_str,
                    "sourceDefinitionId": self.source_id
                })
                
        except Exception as e:
            logger.error(f"Failed to fetch or parse RSS feed {self.name}: {str(e)}", exc_info=True)
            
        return candidates

    def _extract_article_body(self, url: str) -> str:
        """
        Utility method to fetch the canonical webpage and scrape clean text.
        """
        try:
            headers = {
                "User-Agent": "PRISM-Intelligence-Crawler/1.0 (Mobile Triage/V1 Ingestor; +aws-lambda)"
            }
            # Timeout of 10s to prevent hanging Lambdas
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Remove all script, style, nav, header, footer elements
            for element in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
                element.decompose()
                
            # Attempt to locate common content blocks
            body_element = soup.find("article") or soup.find("main") or soup.find("div", {"class": "content"}) or soup.find("body")
            
            if not body_element:
                body_element = soup
                
            # Extract paragraphs to avoid navigation text clutter
            paragraphs = body_element.find_all("p")
            if paragraphs:
                text_content = "\n\n".join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
            else:
                text_content = body_element.get_text()
                
            # Clean up white spacing
            lines = (line.strip() for line in text_content.splitlines())
            chunks = (phrase for line in lines for phrase in line.split("  "))
            clean_text = "\n".join(chunk for chunk in chunks if chunk)
            
            return clean_text.strip()
            
        except Exception as e:
            logger.warning(f"Could not extract full page content from link {url}: {str(e)}. Using fallback.")
            return ""
