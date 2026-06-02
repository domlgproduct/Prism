import logging
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict, Any
from listeners.base import BaseListener

logger = logging.getLogger(__name__)

class HtmlScraperListener(BaseListener):
    def fetch_candidates(self) -> List[Dict[str, Any]]:
        """
        Fetches the primary page URL, parses the HTML, extracts structured readable content,
        and packages it as a single candidate SourceItem.
        """
        logger.info(f"Starting HTML Scrape for: {self.name} ({self.url})")
        candidates = []
        
        try:
            # Parse customized parsing configurations from domainConfig JSON
            config = {}
            if self.source.get("domainConfig"):
                try:
                    config = json.loads(self.source["domainConfig"])
                except Exception:
                    logger.warning(f"Failed to parse domainConfig JSON for {self.name}. Fallback to defaults.")
            
            headers = {
                "User-Agent": "PRISM-Intelligence-Crawler/1.0 (Mobile Triage/V1 Ingestor; +aws-lambda)"
            }
            
            # Fetch page content
            response = requests.get(self.url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Extract Title
            title_selector = config.get("titleSelector")
            title_el = None
            if title_selector:
                title_el = soup.select_one(title_selector)
            if not title_el:
                title_el = soup.find("h1") or soup.find("title")
                
            title = title_el.get_text().strip() if title_el else "Scraped Announcement"
            
            # Remove scripts, headers, navs, sidebars, and footers
            for element in soup(["script", "style", "nav", "header", "footer", "aside", "form"]):
                element.decompose()
                
            # Extract Content
            content_selector = config.get("contentSelector")
            content_el = None
            if content_selector:
                content_el = soup.select_one(content_selector)
            if not content_el:
                content_el = soup.find("article") or soup.find("main") or soup.find("div", {"class": "content"}) or soup.find("body")
                
            if not content_el:
                content_el = soup
                
            # Process paragraphs
            paragraphs = content_el.find_all("p")
            if paragraphs:
                body_text = "\n\n".join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
            else:
                body_text = content_el.get_text()
                
            # Clean spaces
            lines = (line.strip() for line in body_text.splitlines())
            chunks = (phrase for line in lines for phrase in line.split("  "))
            clean_body = "\n".join(chunk for chunk in chunks if chunk).strip()
            
            pub_date = datetime.utcnow().isoformat() + "Z"
            
            logger.info(f"HTML Scrape successful for '{title}'. Extracted {len(clean_body)} characters of text.")
            
            candidates.append({
                "url": self.url,
                "title": title,
                "content": clean_body,
                "publicationDate": pub_date,
                "sourceDefinitionId": self.source_id
            })
            
        except Exception as e:
            logger.error(f"Failed to scrape HTML content for source {self.name}: {str(e)}", exc_info=True)
            
        return candidates
