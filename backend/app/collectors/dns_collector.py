import time
import dns.asyncresolver
import dns.resolver
from typing import List
from app.collectors.base import BaseCollector, CollectorResult, DiscoveredEntity, DiscoveredRelationship

class DNSCollector(BaseCollector):
    name: str = "DNS Collector"

    async def collect(self, target: str) -> CollectorResult:
        start_time = time.time()
        entities: List[DiscoveredEntity] = []
        relationships: List[DiscoveredRelationship] = []
        raw_records: List[str] = []

        # Clean target
        clean_target = target.strip().lower().rstrip(".")
        if clean_target.startswith("http://"):
            clean_target = clean_target[7:]
        elif clean_target.startswith("https://"):
            clean_target = clean_target[8:]
        clean_target = clean_target.split("/")[0].split(":")[0]

        resolver = dns.asyncresolver.Resolver()
        resolver.timeout = 5.0
        resolver.lifetime = 5.0

        # Query Record Types
        record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME"]

        for rtype in record_types:
            try:
                answers = await resolver.resolve(clean_target, rtype)
                for rdata in answers:
                    raw_str = f"{rtype} {rdata.to_text()}"
                    raw_records.append(raw_str)

                    if rtype in ["A", "AAAA"]:
                        ip_val = rdata.to_text().strip()
                        entities.append(DiscoveredEntity(
                            entity_type="IP ADDRESS",
                            value=ip_val,
                            raw_value=ip_val,
                            metadata={"record_type": rtype, "target": clean_target},
                            source="DNS",
                            confidence="OBSERVED"
                        ))
                        relationships.append(DiscoveredRelationship(
                            source_type="DOMAIN",
                            source_value=clean_target,
                            target_type="IP ADDRESS",
                            target_value=ip_val,
                            relation_type="resolves_to",
                            confidence="OBSERVED",
                            source="DNS",
                            metadata={"record_type": rtype}
                        ))

                    elif rtype == "MX":
                        # e.g., "10 mail.example.com."
                        parts = rdata.to_text().split()
                        mx_host = parts[-1].rstrip(".").lower()
                        entities.append(DiscoveredEntity(
                            entity_type="DOMAIN",
                            value=mx_host,
                            raw_value=rdata.to_text(),
                            metadata={"preference": parts[0] if len(parts) > 1 else None},
                            source="DNS",
                            confidence="OBSERVED"
                        ))
                        relationships.append(DiscoveredRelationship(
                            source_type="DOMAIN",
                            source_value=clean_target,
                            target_type="DOMAIN",
                            target_value=mx_host,
                            relation_type="has_mx",
                            confidence="OBSERVED",
                            source="DNS",
                            metadata={"record_type": "MX"}
                        ))

                    elif rtype == "NS":
                        ns_host = rdata.to_text().rstrip(".").lower()
                        entities.append(DiscoveredEntity(
                            entity_type="DOMAIN",
                            value=ns_host,
                            raw_value=rdata.to_text(),
                            metadata={"record_type": "NS"},
                            source="DNS",
                            confidence="OBSERVED"
                        ))
                        relationships.append(DiscoveredRelationship(
                            source_type="DOMAIN",
                            source_value=clean_target,
                            target_type="DOMAIN",
                            target_value=ns_host,
                            relation_type="delegated_to_ns",
                            confidence="OBSERVED",
                            source="DNS",
                            metadata={"record_type": "NS"}
                        ))

                    elif rtype == "CNAME":
                        cname_host = rdata.to_text().rstrip(".").lower()
                        entities.append(DiscoveredEntity(
                            entity_type="DOMAIN",
                            value=cname_host,
                            raw_value=rdata.to_text(),
                            metadata={"record_type": "CNAME"},
                            source="DNS",
                            confidence="OBSERVED"
                        ))
                        relationships.append(DiscoveredRelationship(
                            source_type="DOMAIN",
                            source_value=clean_target,
                            target_type="DOMAIN",
                            target_value=cname_host,
                            relation_type="cname_to",
                            confidence="OBSERVED",
                            source="DNS",
                            metadata={"record_type": "CNAME"}
                        ))

            except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers, dns.exception.Timeout):
                continue
            except Exception as e:
                # Continue resolving other types
                continue

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
