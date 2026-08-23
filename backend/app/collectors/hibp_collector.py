import asyncio
import time
import httpx
from typing import List, Dict, Any, Optional

from app.collectors.base import BaseCollector, CollectorResult, DiscoveredEntity, DiscoveredRelationship
from app.services.ai_config import get_raw_settings

class HIBPCollector(BaseCollector):
    """
    Threat Intel & Leak Collector using HaveIBeenPwned API (BYO-API).
    Checks discovered EMAIL entities for public data breach exposure.
    """
    name: str = "HaveIBeenPwned Threat Intel Collector"

    async def collect(self, target: str) -> CollectorResult:
        start_time = time.time()
        entities: List[DiscoveredEntity] = []
        relationships: List[DiscoveredRelationship] = []
        raw_records: List[str] = []

        settings = get_raw_settings()
        api_key = settings.get("hibp_api_key", "").strip()

        # If no target or no API key, complete gracefully
        if "@" not in target or not api_key:
            return CollectorResult(
                collector_name=self.name,
                target=target,
                success=False,
                error="HIBP API Key not configured or target is not an email address",
                execution_time_ms=(time.time() - start_time) * 1000.0
            )

        headers = {
            "hibp-api-key": api_key,
            "user-agent": "TRACE-OSINT-Engine/1.0"
        }
        
        email = target.strip().lower()
        url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{email}?truncateResponse=false"

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers)
                
                if resp.status_code == 200:
                    breaches = resp.json()
                    raw_records.append(f"Found {len(breaches)} public data breaches for {email}")
                    
                    # Create summary metadata attached to evidence
                    breach_names = [b.get("Name") for b in breaches]
                    entities.append(DiscoveredEntity(
                        entity_type="EMAIL",
                        value=email,
                        raw_value=email,
                        metadata={
                            "breach_count": len(breaches),
                            "breaches": breach_names[:5],
                            "has_breach": True
                        },
                        source="HaveIBeenPwned Threat Intel",
                        confidence="CONFIRMED"
                    ))
                elif resp.status_code == 404:
                    raw_records.append(f"No breach records found for {email}")
                else:
                    raw_records.append(f"HIBP API returned status code: {resp.status_code}")

        except Exception as e:
            return CollectorResult(
                collector_name=self.name,
                target=target,
                success=False,
                error=f"HIBP collection error: {str(e)}",
                execution_time_ms=(time.time() - start_time) * 1000.0
            )

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
