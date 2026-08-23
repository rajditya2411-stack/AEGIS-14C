import asyncio
import re
import time
import httpx
from typing import List, Dict, Any, Optional

from app.collectors.base import BaseCollector, CollectorResult, DiscoveredEntity, DiscoveredRelationship

TWITTER_MIRRORS = [
    "https://nitter.poast.org/{}",
    "https://nitter.privacydev.net/{}",
    "https://nitter.lucabrunox.com/{}"
]

INSTAGRAM_MIRRORS = [
    "https://www.picuki.com/profile/{}",
    "https://imginn.com/{}",
    "https://dumpoir.com/v/{}"
]

class SocialMirrorsCollector(BaseCollector):
    """
    Isolated Web Mirror Collector for Twitter/X and Instagram.
    Zero API keys or login credentials required.
    """
    name: str = "Web Mirrors Collector (Twitter/X & Instagram)"

    @staticmethod
    def extract_candidate_username(target: str) -> str:
        val = target.strip().lower()
        if val.startswith("http://") or val.startswith("https://"):
            val = re.sub(r"^https?://[^/]+/", "", val)
            val = val.split("/")[0].split("?")[0]
        if "@" in val:
            if val.startswith("@"):
                val = val.lstrip("@")
            else:
                val = val.split("@")[0]
        if "." in val:
            parts = val.split(".")
            if len(parts) >= 2 and parts[0]:
                val = parts[0]
        val = val.lstrip("@").strip()
        val = re.sub(r"[^a-zA-Z0-9_\-\.]", "", val)
        return val

    async def _check_twitter_mirrors(self, client: httpx.AsyncClient, username: str) -> Optional[str]:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 TRACE-OSINT/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        for mirror_tmpl in TWITTER_MIRRORS:
            url = mirror_tmpl.format(username)
            try:
                resp = await client.get(url, headers=headers, timeout=5.0, follow_redirects=True)
                if resp.status_code == 200:
                    text_lower = resp.text.lower()
                    if "user not found" not in text_lower and "timeline-none" not in text_lower and "404 not found" not in text_lower:
                        return f"https://x.com/{username}"
            except Exception:
                continue
        return None

    async def _check_instagram_mirrors(self, client: httpx.AsyncClient, username: str) -> Optional[str]:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 TRACE-OSINT/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        for mirror_tmpl in INSTAGRAM_MIRRORS:
            url = mirror_tmpl.format(username)
            try:
                resp = await client.get(url, headers=headers, timeout=5.0, follow_redirects=True)
                if resp.status_code == 200:
                    text_lower = resp.text.lower()
                    if "user not found" not in text_lower and "page not found" not in text_lower and "error-page" not in text_lower:
                        return f"https://www.instagram.com/{username}/"
            except Exception:
                continue
        return None

    async def collect(self, target: str) -> CollectorResult:
        start_time = time.time()
        entities: List[DiscoveredEntity] = []
        relationships: List[DiscoveredRelationship] = []
        raw_records: List[str] = []

        username = self.extract_candidate_username(target)
        if not username or len(username) < 2:
            return CollectorResult(
                collector_name=self.name,
                target=target,
                success=False,
                error="Invalid username target",
                execution_time_ms=(time.time() - start_time) * 1000.0
            )

        async with httpx.AsyncClient(verify=False) as client:
            t_task = self._check_twitter_mirrors(client, username)
            i_task = self._check_instagram_mirrors(client, username)
            twitter_url, insta_url = await asyncio.gather(t_task, i_task, return_exceptions=True)

        found_count = 0

        # Handle Twitter/X Result
        if isinstance(twitter_url, str) and twitter_url.startswith("http"):
            found_count += 1
            raw_records.append(f"Discovered Twitter/X handle via Web Mirror: {twitter_url}")
            entities.append(DiscoveredEntity(
                entity_type="URL",
                value=twitter_url,
                raw_value=twitter_url,
                metadata={"platform": "Twitter / X", "category": "Social", "method": "Web Mirror Resolver"},
                source="Web Mirrors (Twitter/X)",
                confidence="CONFIRMED"
            ))
            relationships.append(DiscoveredRelationship(
                source_type="USERNAME",
                source_value=username,
                target_type="URL",
                target_value=twitter_url,
                relation_type="has_profile",
                confidence="CONFIRMED",
                source="Web Mirrors (Twitter/X)"
            ))

        # Handle Instagram Result
        if isinstance(insta_url, str) and insta_url.startswith("http"):
            found_count += 1
            raw_records.append(f"Discovered Instagram handle via Web Mirror: {insta_url}")
            entities.append(DiscoveredEntity(
                entity_type="URL",
                value=insta_url,
                raw_value=insta_url,
                metadata={"platform": "Instagram", "category": "Social", "method": "Web Mirror Resolver"},
                source="Web Mirrors (Instagram)",
                confidence="CONFIRMED"
            ))
            relationships.append(DiscoveredRelationship(
                source_type="USERNAME",
                source_value=username,
                target_type="URL",
                target_value=insta_url,
                relation_type="has_profile",
                confidence="CONFIRMED",
                source="Web Mirrors (Instagram)"
            ))

        exec_time = (time.time() - start_time) * 1000.0
        return CollectorResult(
            collector_name=self.name,
            target=target,
            success=found_count > 0,
            entities=entities,
            relationships=relationships,
            raw_records=raw_records,
            execution_time_ms=exec_time
        )
