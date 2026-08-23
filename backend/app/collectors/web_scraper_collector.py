import re
import time
import httpx
from bs4 import BeautifulSoup
from typing import List, Set, Dict, Any, Optional

from app.collectors.base import BaseCollector, CollectorResult, DiscoveredEntity, DiscoveredRelationship

class WebScraperCollector(BaseCollector):
    name: str = "Web Scraper Collector"

    async def collect(self, target: str) -> CollectorResult:
        start_time = time.time()
        entities: List[DiscoveredEntity] = []
        relationships: List[DiscoveredRelationship] = []
        raw_records: List[str] = []

        # 1. Clean target domain
        clean_target = target.strip().lower().rstrip(".")
        if clean_target.startswith("http://"):
            clean_target = clean_target[7:]
        elif clean_target.startswith("https://"):
            clean_target = clean_target[8:]
        clean_target = clean_target.split("/")[0].split(":")[0]

        if not clean_target:
            return CollectorResult(
                collector_name=self.name,
                target=target,
                success=False,
                error="Invalid target domain",
                execution_time_ms=0.0
            )

        html_content = ""
        final_url = f"https://{clean_target}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TRACE-OSINT/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }

        # 2. Fetch page HTML (HTTPS first, fallback HTTP)
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, verify=False) as client:
                try:
                    response = await client.get(final_url, headers=headers)
                    if response.status_code == 200:
                        html_content = response.text
                        final_url = str(response.url)
                except Exception:
                    # Fallback to HTTP
                    final_url = f"http://{clean_target}"
                    response = await client.get(final_url, headers=headers)
                    if response.status_code == 200:
                        html_content = response.text
                        final_url = str(response.url)
        except Exception as e:
            raw_records.append(f"HTTP request failed for {clean_target}: {str(e)}")
            return CollectorResult(
                collector_name=self.name,
                target=clean_target,
                success=False,
                entities=[],
                relationships=[],
                raw_records=raw_records,
                error=f"Could not connect to target website: {str(e)}",
                execution_time_ms=(time.time() - start_time) * 1000.0
            )

        if not html_content:
            return CollectorResult(
                collector_name=self.name,
                target=clean_target,
                success=False,
                raw_records=["Empty HTML response received"],
                execution_time_ms=(time.time() - start_time) * 1000.0
            )

        soup = BeautifulSoup(html_content, "html.parser")
        raw_records.append(f"Successfully scraped HTML from {final_url} ({len(html_content)} bytes)")

        # 3. Extract Analytics & Tracking IDs
        discovered_trackers: Set[str] = set()

        # Regex patterns for tracking IDs
        ua_matches = re.findall(r"\bUA-\d+-\d+\b", html_content)
        ga4_matches = re.findall(r"\bG-[A-Z0-9]{6,12}\b", html_content)
        pub_matches = re.findall(r"\b(?:ca-)?pub-\d{16}\b", html_content, re.IGNORECASE)
        gtm_matches = re.findall(r"\bGTM-[A-Z0-9]{4,10}\b", html_content)

        all_trackers = set(ua_matches + ga4_matches + pub_matches + gtm_matches)
        for tid in all_trackers:
            tid_upper = tid.upper()
            if tid_upper not in discovered_trackers:
                discovered_trackers.add(tid_upper)
                tracker_type = "Google Analytics UA" if tid_upper.startswith("UA-") else \
                               "Google Analytics 4" if tid_upper.startswith("G-") else \
                               "Google AdSense / Publisher" if "PUB-" in tid_upper else \
                               "Google Tag Manager"
                
                raw_records.append(f"Found Tracking ID: {tid_upper} ({tracker_type})")
                entities.append(DiscoveredEntity(
                    entity_type="TRACKING_ID",
                    value=tid_upper,
                    raw_value=tid,
                    metadata={"tracker_type": tracker_type, "source_url": final_url},
                    source="Web Scraper",
                    confidence="OBSERVED"
                ))
                relationships.append(DiscoveredRelationship(
                    source_type="DOMAIN",
                    source_value=clean_target,
                    target_type="TRACKING_ID",
                    target_value=tid_upper,
                    relation_type="uses_tracker",
                    confidence="OBSERVED",
                    source="Web Scraper",
                    metadata={"method": "HTML Scrape"}
                ))

        # 4. Extract Copyright Holders & Corporate Names
        footer_text = ""
        footer_tags = soup.find_all(["footer", "div", "p", "span", "small"], class_=re.compile(r"footer|copyright|legal|bottom", re.IGNORECASE))
        if footer_tags:
            footer_text = " ".join([tag.get_text(separator=" ", strip=True) for tag in footer_tags])
        else:
            footer_text = soup.get_text(separator=" ", strip=True)

        copyright_patterns = [
            r"(?:copyright|©|&copy;)\s*(?:\d{4}\s*[-–—]?\s*\d{0,4})?\s*([A-Za-z0-9\s,\.\-&]{3,60})",
            r"(\b[A-Za-z0-9\s,\.\-&]{3,50}\b)\s*(?:All [Rr]ights [Rr]eserved|\. All [Rr]ights)",
        ]

        discovered_orgs: Set[str] = set()
        for pattern in copyright_patterns:
            matches = re.findall(pattern, footer_text, re.IGNORECASE)
            for m in matches:
                clean_org = m.strip()
                # Clean trailing noise words
                clean_org = re.sub(r"\s*(?:all rights reserved|privacy policy|terms of service|contact us|inc\.?|llc\.?|ltd\.?)$", "", clean_org, flags=re.IGNORECASE)
                clean_org = re.sub(r"^(?:by|for|the|from)\s+", "", clean_org, flags=re.IGNORECASE).strip()

                # Basic validation
                if len(clean_org) >= 3 and len(clean_org) <= 60:
                    # Ignore common generic junk
                    junk_terms = {"rights", "reserved", "copyright", "home", "privacy", "terms", "sitemap", "all", "site", "designed", "powered"}
                    words = set(clean_org.lower().split())
                    if not words.issubset(junk_terms) and not clean_org.isdigit():
                        if clean_org.lower() not in [o.lower() for o in discovered_orgs]:
                            discovered_orgs.add(clean_org)

        for org in list(discovered_orgs)[:3]:  # Limit top 3 relevant org names
            raw_records.append(f"Found Copyright / Corporate Name: {org}")
            entities.append(DiscoveredEntity(
                entity_type="ORGANIZATION",
                value=org,
                raw_value=org,
                metadata={"extracted_from": "Footer / Copyright Tag", "source_url": final_url},
                source="Web Scraper",
                confidence="OBSERVED"
            ))
            relationships.append(DiscoveredRelationship(
                source_type="DOMAIN",
                source_value=clean_target,
                target_type="ORGANIZATION",
                target_value=org,
                relation_type="owned_by",
                confidence="OBSERVED",
                source="Web Scraper",
                metadata={"method": "HTML Copyright Scrape"}
            ))

        # 5. Extract Public Contact Email Addresses
        discovered_emails: Set[str] = set()
        email_matches = re.findall(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b", html_content)
        
        # Also check mailto links
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("mailto:"):
                email_val = href.split("mailto:")[1].split("?")[0].strip()
                if email_val:
                    email_matches.append(email_val)

        ignored_domains = {"example.com", "domain.com", "schema.org", "w3.org", "sentry.io", "github.com", "facebook.com", "twitter.com", "googleapis.com"}
        ignored_extensions = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".css", ".js", ".webp", ".woff", ".ttf"}

        for em in email_matches:
            em_lower = em.lower().strip()
            domain_part = em_lower.split("@")[-1] if "@" in em_lower else ""
            if domain_part in ignored_domains:
                continue
            if any(em_lower.endswith(ext) for ext in ignored_extensions):
                continue
            if em_lower not in discovered_emails and len(em_lower) <= 100:
                discovered_emails.add(em_lower)

        for email_val in list(discovered_emails)[:10]:  # Limit top 10 emails
            raw_records.append(f"Found Public Email: {email_val}")
            entities.append(DiscoveredEntity(
                entity_type="EMAIL",
                value=email_val,
                raw_value=email_val,
                metadata={"extracted_from": "Web Scraper", "source_url": final_url},
                source="Web Scraper",
                confidence="OBSERVED"
            ))
            relationships.append(DiscoveredRelationship(
                source_type="DOMAIN",
                source_value=clean_target,
                target_type="EMAIL",
                target_value=email_val,
                relation_type="lists_email",
                confidence="OBSERVED",
                source="Web Scraper",
                metadata={"method": "HTML Scrape"}
            ))

        # 6. Extract Public Phone Numbers
        discovered_phones: Set[str] = set()

        # Check tel: links
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.startswith("tel:"):
                phone_val = href.split("tel:")[1].strip()
                if phone_val and len(phone_val) >= 7:
                    discovered_phones.add(phone_val)

        # International phone format regex
        phone_matches = re.findall(r"\b\+\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b", html_content)
        for ph in phone_matches:
            ph_clean = ph.strip()
            if len(ph_clean) >= 8 and len(ph_clean) <= 25:
                discovered_phones.add(ph_clean)

        for phone_val in list(discovered_phones)[:5]:  # Limit top 5 phones
            raw_records.append(f"Found Public Phone: {phone_val}")
            entities.append(DiscoveredEntity(
                entity_type="PHONE",
                value=phone_val,
                raw_value=phone_val,
                metadata={"extracted_from": "Web Scraper", "source_url": final_url},
                source="Web Scraper",
                confidence="OBSERVED"
            ))
            relationships.append(DiscoveredRelationship(
                source_type="DOMAIN",
                source_value=clean_target,
                target_type="PHONE",
                target_value=phone_val,
                relation_type="lists_phone",
                confidence="OBSERVED",
                source="Web Scraper",
                metadata={"method": "HTML Scrape"}
            ))

        exec_time = (time.time() - start_time) * 1000.0
        return CollectorResult(
            collector_name=self.name,
            target=clean_target,
            success=len(entities) > 0 or len(raw_records) > 0,
            entities=entities,
            relationships=relationships,
            raw_records=raw_records,
            execution_time_ms=exec_time
        )
