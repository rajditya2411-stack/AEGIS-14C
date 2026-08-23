import time
import httpx
from typing import List, Set
from app.collectors.base import BaseCollector, CollectorResult, DiscoveredEntity, DiscoveredRelationship

class CertificateCollector(BaseCollector):
    name: str = "Certificate Transparency Collector"

    async def collect(self, target: str) -> CollectorResult:
        start_time = time.time()
        entities: List[DiscoveredEntity] = []
        relationships: List[DiscoveredRelationship] = []
        raw_records: List[str] = []

        # Clean target domain
        clean_target = target.strip().lower().rstrip(".")
        if clean_target.startswith("http://"):
            clean_target = clean_target[7:]
        elif clean_target.startswith("https://"):
            clean_target = clean_target[8:]
        clean_target = clean_target.split("/")[0].split(":")[0]

        discovered_subdomains: Set[str] = set()

        url = f"https://crt.sh/?q=%.{clean_target}&output=json"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRACE-OSINT/1.0"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    for item in data[:50]:  # Limit top 50 records to avoid flooding
                        name_value = item.get("name_value", "")
                        issuer_name = item.get("issuer_name", "Unknown Issuer")
                        logged_at = item.get("entry_timestamp", "")

                        raw_records.append(f"Cert #{item.get('id')}: {name_value} (Issuer: {issuer_name})")

                        # name_value can contain multiple domains separated by newline
                        for sub in name_value.split("\n"):
                            sub_clean = sub.strip().lower().lstrip("*.")
                            if sub_clean and clean_target in sub_clean and sub_clean != clean_target:
                                discovered_subdomains.add(sub_clean)

                    # Create entities for discovered subdomains
                    for sub in discovered_subdomains:
                        entities.append(DiscoveredEntity(
                            entity_type="DOMAIN",
                            value=sub,
                            raw_value=sub,
                            metadata={"discovered_via": "crt.sh", "parent_target": clean_target},
                            source="crt.sh",
                            confidence="OBSERVED"
                        ))
                        relationships.append(DiscoveredRelationship(
                            source_type="DOMAIN",
                            source_value=sub,
                            target_type="DOMAIN",
                            target_value=clean_target,
                            relation_type="subdomain_of",
                            confidence="OBSERVED",
                            source="crt.sh",
                            metadata={"method": "Certificate Transparency"}
                        ))

        except Exception as e:
            # If crt.sh times out or is temporarily rate limited, record error gracefully
            return CollectorResult(
                collector_name=self.name,
                target=clean_target,
                success=len(entities) > 0,
                entities=entities,
                relationships=relationships,
                raw_records=raw_records,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000.0
            )

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
