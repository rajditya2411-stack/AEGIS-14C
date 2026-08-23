import asyncio
import time
import httpx
from typing import List, Dict, Any, Optional

from app.collectors.base import BaseCollector, CollectorResult, DiscoveredEntity, DiscoveredRelationship
from app.collectors.social_mirrors_collector import SocialMirrorsCollector
from app.services.ai_config import get_raw_settings

class SocialCascadeCollector(BaseCollector):
    """
    Smart Fallback Cascade Collector for Twitter/X and Instagram.
    Priority 1: Direct Official Developer API (if configured)
    Priority 2: Apify Cloud Scraper Token (if configured)
    Priority 3: Web Mirrors Collector (100% Free Out-of-the-Box Default)
    """
    name: str = "Smart Fallback Social Cascade (Twitter & Instagram)"

    @staticmethod
    def extract_candidate_username(target: str) -> str:
        return SocialMirrorsCollector.extract_candidate_username(target)

    async def _check_official_twitter(self, bearer_token: str, username: str) -> Optional[str]:
        headers = {"Authorization": f"Bearer {bearer_token}"}
        url = f"https://api.twitter.com/2/users/by/username/{username}"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200 and "data" in resp.json():
                    return f"https://x.com/{username}"
        except Exception:
            return None
        return None

    async def _check_apify(self, token: str, username: str, platform: str) -> Optional[str]:
        """
        Queries Apify's profile resolver actor using the user's free-tier token.
        """
        headers = {"Authorization": f"Bearer {token}"}
        # Lightweight Apify profile verification request
        actor_id = "apify~instagram-profile-scraper" if platform == "instagram" else "apidojo~twitter-user-scraper"
        url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items?timeout=15"
        payload = {"usernames": [username]} if platform == "instagram" else {"twitterHandles": [username]}
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code in [200, 201]:
                    items = resp.json()
                    if isinstance(items, list) and len(items) > 0:
                        return f"https://www.instagram.com/{username}/" if platform == "instagram" else f"https://x.com/{username}"
        except Exception:
            return None
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
                error="Invalid candidate handle",
                execution_time_ms=(time.time() - start_time) * 1000.0
            )

        settings = get_raw_settings()
        twitter_token = settings.get("twitter_bearer_token", "").strip()
        insta_token = settings.get("instagram_access_token", "").strip()
        apify_token = settings.get("apify_api_token", "").strip()

        twitter_found_url = None
        insta_found_url = None
        tier_used = "Tier 3 (Web Mirrors Fallback)"

        # -------------------------------------------------------------
        # Tier 1: Check Direct Official Keys
        # -------------------------------------------------------------
        if twitter_token:
            tier_used = "Tier 1 (Direct Official API)"
            twitter_found_url = await self._check_official_twitter(twitter_token, username)
            if twitter_found_url:
                raw_records.append(f"[Tier 1: Twitter Official API] Verified handle @{username}")

        # -------------------------------------------------------------
        # Tier 2: Check Apify Cloud Scraper Token
        # -------------------------------------------------------------
        if apify_token:
            if not twitter_found_url:
                twitter_found_url = await self._check_apify(apify_token, username, "twitter")
                if twitter_found_url:
                    tier_used = "Tier 2 (Apify Free Tier)"
                    raw_records.append(f"[Tier 2: Apify Cloud Scraper] Verified Twitter handle @{username}")

            if not insta_found_url:
                insta_found_url = await self._check_apify(apify_token, username, "instagram")
                if insta_found_url:
                    tier_used = "Tier 2 (Apify Free Tier)"
                    raw_records.append(f"[Tier 2: Apify Cloud Scraper] Verified Instagram handle @{username}")

        # -------------------------------------------------------------
        # Tier 3: Default Zero-Key Web Mirrors Fallback
        # -------------------------------------------------------------
        if not twitter_found_url or not insta_found_url:
            mirror_collector = SocialMirrorsCollector()
            mirror_res = await mirror_collector.collect(target)
            
            for ent in mirror_res.entities:
                if "x.com" in ent.value and not twitter_found_url:
                    twitter_found_url = ent.value
                    raw_records.append(f"[Tier 3: Web Mirror] Verified Twitter/X profile: {ent.value}")
                elif "instagram.com" in ent.value and not insta_found_url:
                    insta_found_url = ent.value
                    raw_records.append(f"[Tier 3: Web Mirror] Verified Instagram profile: {ent.value}")

        # Ingest discovered profiles
        if twitter_found_url:
            entities.append(DiscoveredEntity(
                entity_type="URL",
                value=twitter_found_url,
                raw_value=twitter_found_url,
                metadata={"platform": "Twitter / X", "category": "Social", "cascade_tier": tier_used},
                source="Social Cascade Engine",
                confidence="CONFIRMED"
            ))
            relationships.append(DiscoveredRelationship(
                source_type="USERNAME",
                source_value=username,
                target_type="URL",
                target_value=twitter_found_url,
                relation_type="has_profile",
                confidence="CONFIRMED",
                source="Social Cascade Engine",
                metadata={"tier": tier_used}
            ))

        if insta_found_url:
            entities.append(DiscoveredEntity(
                entity_type="URL",
                value=insta_found_url,
                raw_value=insta_found_url,
                metadata={"platform": "Instagram", "category": "Social", "cascade_tier": tier_used},
                source="Social Cascade Engine",
                confidence="CONFIRMED"
            ))
            relationships.append(DiscoveredRelationship(
                source_type="USERNAME",
                source_value=username,
                target_type="URL",
                target_value=insta_found_url,
                relation_type="has_profile",
                confidence="CONFIRMED",
                source="Social Cascade Engine",
                metadata={"tier": tier_used}
            ))

        exec_time = (time.time() - start_time) * 1000.0
        return CollectorResult(
            collector_name=self.name,
            target=target,
            success=len(entities) > 0,
            entities=entities,
            relationships=relationships,
            raw_records=raw_records,
            execution_time_ms=exec_time
        )
