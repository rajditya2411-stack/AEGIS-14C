import asyncio
import re
import time
import httpx
from typing import List, Dict, Any, Optional

from app.collectors.base import BaseCollector, CollectorResult, DiscoveredEntity, DiscoveredRelationship

# Major social platform signature definitions
PLATFORM_SIGNATURES: List[Dict[str, Any]] = [
    {
        "name": "YouTube",
        "url": "https://www.youtube.com/@{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Media"
    },
    {
        "name": "GitHub",
        "url": "https://github.com/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Developer"
    },
    {
        "name": "GitLab",
        "url": "https://gitlab.com/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Developer"
    },
    {
        "name": "Reddit",
        "url": "https://www.reddit.com/user/{}/",
        "error_type": "response_text",
        "error_text": "page not found",
        "category": "Community"
    },
    {
        "name": "Keybase",
        "url": "https://keybase.io/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Security"
    },
    {
        "name": "Telegram",
        "url": "https://t.me/{}",
        "error_type": "response_text",
        "error_text": "If you have <strong>Telegram</strong>, you can contact",
        "category": "Messaging"
    },
    {
        "name": "Medium",
        "url": "https://medium.com/@{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Blogging"
    },
    {
        "name": "Dev.to",
        "url": "https://dev.to/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Developer"
    },
    {
        "name": "DockerHub",
        "url": "https://hub.docker.com/v2/users/{}/",
        "profile_url": "https://hub.docker.com/u/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Developer"
    },
    {
        "name": "ProductHunt",
        "url": "https://www.producthunt.com/@{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Community"
    },
    {
        "name": "HackerNews",
        "url": "https://news.ycombinator.com/user?id={}",
        "error_type": "response_text",
        "error_text": "No such user.",
        "category": "Developer"
    },
    {
        "name": "Pinterest",
        "url": "https://www.pinterest.com/{}/",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Social"
    },
    {
        "name": "Vimeo",
        "url": "https://vimeo.com/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Media"
    },
    {
        "name": "Patreon",
        "url": "https://www.patreon.com/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Creator"
    },
    {
        "name": "Substack",
        "url": "https://{}.substack.com",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Blogging"
    },
    {
        "name": "Replit",
        "url": "https://replit.com/@{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Developer"
    },
    {
        "name": "LeetCode",
        "url": "https://leetcode.com/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Developer"
    },
    {
        "name": "Kaggle",
        "url": "https://www.kaggle.com/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Data Science"
    },
    {
        "name": "Pastebin",
        "url": "https://pastebin.com/u/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Developer"
    },
    {
        "name": "SoundCloud",
        "url": "https://soundcloud.com/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Media"
    },
    {
        "name": "Spotify Artist/User",
        "url": "https://open.spotify.com/user/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Media"
    },
    {
        "name": "TikTok",
        "url": "https://www.tiktok.com/@{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Media"
    },
    {
        "name": "Twitter / X",
        "url": "https://x.com/{}",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Social"
    },
    {
        "name": "Instagram",
        "url": "https://www.instagram.com/{}/",
        "error_type": "status_code",
        "error_code": 404,
        "category": "Social"
    }
]

class SocialFinderCollector(BaseCollector):
    name: str = "Social & Username Footprint Collector"

    @staticmethod
    def extract_candidate_username(target: str) -> str:
        """
        Extracts a candidate username from domain, email, URL, or plain handle.
        """
        val = target.strip().lower()

        # Handle full URLs
        if val.startswith("http://") or val.startswith("https://"):
            val = re.sub(r"^https?://[^/]+/", "", val)
            val = val.split("/")[0].split("?")[0]

        # Handle email vs leading handle
        if "@" in val:
            if val.startswith("@"):
                val = val.lstrip("@")
            else:
                val = val.split("@")[0]

        # Handle domain name (e.g. hashicorp.com -> hashicorp)
        if "." in val:
            parts = val.split(".")
            if len(parts) >= 2 and parts[0]:
                val = parts[0]

        # Strip leading @ and any unwanted punctuation
        val = val.lstrip("@").strip()
        val = re.sub(r"[^a-zA-Z0-9_\-\.]", "", val)
        return val

    async def _check_platform(
        self,
        client: httpx.AsyncClient,
        platform: Dict[str, Any],
        username: str,
        semaphore: asyncio.Semaphore
    ) -> Optional[Dict[str, Any]]:
        url = platform["url"].format(username)
        profile_url = platform.get("profile_url", platform["url"]).format(username)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 TRACE-OSINT/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        async with semaphore:
            try:
                resp = await client.get(url, headers=headers, timeout=7.0, follow_redirects=True)
                
                # Evaluation based on signature type
                if platform["error_type"] == "status_code":
                    if resp.status_code == 200:
                        # Extra safeguard against generic 404 body text inside 200 response
                        body_lower = resp.text.lower()
                        if "page not found" in body_lower or "user not found" in body_lower or "404 not found" in body_lower:
                            return None
                        return {
                            "platform": platform["name"],
                            "profile_url": profile_url,
                            "category": platform["category"],
                            "status_code": resp.status_code
                        }
                elif platform["error_type"] == "response_text":
                    # If error text is absent and status is 200, user exists
                    if resp.status_code == 200 and platform["error_text"] not in resp.text:
                        return {
                            "platform": platform["name"],
                            "profile_url": profile_url,
                            "category": platform["category"],
                            "status_code": resp.status_code
                        }
            except Exception:
                # Timeout or connection drop for individual platform
                return None

        return None

    async def collect(self, target: str) -> CollectorResult:
        start_time = time.time()
        entities: List[DiscoveredEntity] = []
        relationships: List[DiscoveredRelationship] = []
        raw_records: List[str] = []

        candidate_username = self.extract_candidate_username(target)
        if not candidate_username or len(candidate_username) < 2:
            return CollectorResult(
                collector_name=self.name,
                target=target,
                success=False,
                error="Could not derive a valid candidate username from target",
                execution_time_ms=(time.time() - start_time) * 1000.0
            )

        raw_records.append(f"Derived candidate handle: @{candidate_username} from target '{target}'")

        # Create primary USERNAME entity
        username_entity = DiscoveredEntity(
            entity_type="USERNAME",
            value=candidate_username,
            raw_value=f"@{candidate_username}",
            metadata={"candidate_source": target},
            source="Social Finder",
            confidence="OBSERVED"
        )
        entities.append(username_entity)

        # Run concurrent checks with a semaphore limit of 10
        semaphore = asyncio.Semaphore(10)
        async with httpx.AsyncClient(verify=False) as client:
            tasks = [
                self._check_platform(client, p, candidate_username, semaphore)
                for p in PLATFORM_SIGNATURES
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        found_count = 0
        for res in results:
            if isinstance(res, dict) and res.get("profile_url"):
                platform_name = res["platform"]
                profile_url = res["profile_url"]
                category = res.get("category", "Social")
                found_count += 1

                raw_records.append(f"Found active profile on {platform_name}: {profile_url}")

                # Create URL entity for the social profile
                entities.append(DiscoveredEntity(
                    entity_type="URL",
                    value=profile_url,
                    raw_value=profile_url,
                    metadata={"platform": platform_name, "category": category, "username": candidate_username},
                    source="Social Finder",
                    confidence="CONFIRMED"
                ))

                # Create Relationship: USERNAME --(has_profile)--> URL
                relationships.append(DiscoveredRelationship(
                    source_type="USERNAME",
                    source_value=candidate_username,
                    target_type="URL",
                    target_value=profile_url,
                    relation_type="has_profile",
                    confidence="CONFIRMED",
                    source="Social Finder",
                    metadata={"platform": platform_name, "category": category}
                ))

                # If target was a domain, connect target domain to username
                if "." in target and not target.startswith("@"):
                    clean_domain = target.strip().lower().replace("https://", "").replace("http://", "").split("/")[0]
                    relationships.append(DiscoveredRelationship(
                        source_type="DOMAIN",
                        source_value=clean_domain,
                        target_type="USERNAME",
                        target_value=candidate_username,
                        relation_type="associated_with",
                        confidence="OBSERVED",
                        source="Social Finder",
                        metadata={"method": "Brand/Handle Extraction"}
                    ))

        exec_time = (time.time() - start_time) * 1000.0
        return CollectorResult(
            collector_name=self.name,
            target=target,
            success=found_count > 0 or len(entities) > 0,
            entities=entities,
            relationships=relationships,
            raw_records=raw_records,
            execution_time_ms=exec_time
        )
