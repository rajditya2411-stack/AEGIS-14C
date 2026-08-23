import asyncio
import time
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Investigation
from app.collectors.base import BaseCollector, CollectorResult
from app.collectors.dns_collector import DNSCollector
from app.collectors.cert_collector import CertificateCollector
from app.collectors.ip_collector import IPNetworkCollector
from app.collectors.repo_collector import PublicRepoCollector
from app.collectors.related_domains_collector import RelatedDomainsCollector
from app.collectors.web_scraper_collector import WebScraperCollector
from app.collectors.social_finder_collector import SocialFinderCollector
from app.collectors.hibp_collector import HIBPCollector
from app.services.social_cascade_service import SocialCascadeCollector
from app.normalization.engine import resolve_and_ingest_results

class ScanOrchestrator:
    def __init__(self):
        self.collectors: List[BaseCollector] = [
            DNSCollector(),
            CertificateCollector(),
            IPNetworkCollector(),
            PublicRepoCollector(),
            RelatedDomainsCollector(),
            WebScraperCollector(),
            SocialFinderCollector(),
            SocialCascadeCollector(),
            HIBPCollector()
        ]

    async def execute_scan(
        self,
        db: AsyncSession,
        investigation_id: str,
        target_override: Optional[str] = None
    ) -> Dict[str, Any]:
        start_time = time.time()

        # 1. Fetch Investigation
        stmt = select(Investigation).where(Investigation.id == investigation_id)
        inv = (await db.execute(stmt)).scalar_one_or_none()
        if not inv:
            raise ValueError(f"Investigation {investigation_id} not found")

        target = target_override or inv.target

        # 2. Run all collectors concurrently
        tasks = [c.collect(target) for c in self.collectors]
        results: List[CollectorResult] = await asyncio.gather(*tasks, return_exceptions=False)

        # 3. Pipe results into Normalization & Resolution Engine
        stats = await resolve_and_ingest_results(db, investigation_id, results)

        total_exec_time = (time.time() - start_time) * 1000.0

        collector_summaries = []
        for r in results:
            collector_summaries.append({
                "collector": r.collector_name,
                "success": r.success,
                "entities_found": len(r.entities),
                "relationships_found": len(r.relationships),
                "execution_time_ms": round(r.execution_time_ms, 2),
                "error": r.error
            })

        return {
            "investigation_id": investigation_id,
            "target": target,
            "total_execution_time_ms": round(total_exec_time, 2),
            "stats": stats,
            "collectors": collector_summaries
        }
