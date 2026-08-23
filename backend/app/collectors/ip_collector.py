import time
import httpx
import ipaddress
import socket
from typing import List
from app.collectors.base import BaseCollector, CollectorResult, DiscoveredEntity, DiscoveredRelationship

class IPNetworkCollector(BaseCollector):
    name: str = "IP & Network Collector"

    def _is_ip(self, val: str) -> bool:
        try:
            ipaddress.ip_address(val)
            return True
        except ValueError:
            return False

    async def collect(self, target: str) -> CollectorResult:
        start_time = time.time()
        entities: List[DiscoveredEntity] = []
        relationships: List[DiscoveredRelationship] = []
        raw_records: List[str] = []

        clean_target = target.strip().lower().rstrip(".")
        if clean_target.startswith("http://"):
            clean_target = clean_target[7:]
        elif clean_target.startswith("https://"):
            clean_target = clean_target[8:]
        clean_target = clean_target.split("/")[0].split(":")[0]

        target_ip = clean_target
        is_direct_ip = self._is_ip(clean_target)

        # If domain, resolve to IP first
        if not is_direct_ip:
            try:
                target_ip = socket.gethostbyname(clean_target)
                raw_records.append(f"DNS Resolution: {clean_target} -> {target_ip}")
            except Exception as e:
                return CollectorResult(
                    collector_name=self.name,
                    target=clean_target,
                    success=False,
                    error=f"Could not resolve domain to IP: {str(e)}",
                    execution_time_ms=(time.time() - start_time) * 1000.0
                )

        # Add IP entity
        entities.append(DiscoveredEntity(
            entity_type="IP ADDRESS",
            value=target_ip,
            raw_value=target_ip,
            metadata={"is_direct_target": is_direct_ip},
            source="IP/Network",
            confidence="OBSERVED"
        ))

        if not is_direct_ip:
            relationships.append(DiscoveredRelationship(
                source_type="DOMAIN",
                source_value=clean_target,
                target_type="IP ADDRESS",
                target_value=target_ip,
                relation_type="resolves_to",
                confidence="OBSERVED",
                source="IP/Network",
                metadata={"resolved_ip": target_ip}
            ))

        # Query RDAP / IP info API
        headers = {"User-Agent": "TRACE-OSINT/1.0"}
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                # Query public IP info lookup
                resp = await client.get(f"https://ipapi.co/{target_ip}/json/", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    asn_val = data.get("asn")  # e.g., "AS13335"
                    org_val = data.get("org")  # e.g., "Cloudflare, Inc."
                    city = data.get("city")
                    country = data.get("country_name")

                    raw_records.append(f"RDAP/IP: ASN={asn_val}, Org={org_val}, Location={city}, {country}")

                    if asn_val:
                        asn_std = asn_val.upper()
                        if not asn_std.startswith("AS"):
                            asn_std = f"AS{asn_std}"

                        entities.append(DiscoveredEntity(
                            entity_type="ASN",
                            value=asn_std,
                            raw_value=asn_val,
                            metadata={"city": city, "country": country, "network": data.get("network")},
                            source="RDAP/IP",
                            confidence="OBSERVED"
                        ))

                        relationships.append(DiscoveredRelationship(
                            source_type="IP ADDRESS",
                            source_value=target_ip,
                            target_type="ASN",
                            target_value=asn_std,
                            relation_type="hosted_on",
                            confidence="OBSERVED",
                            source="RDAP/IP",
                            metadata={"ip": target_ip}
                        ))

                        if org_val:
                            entities.append(DiscoveredEntity(
                                entity_type="ORGANIZATION",
                                value=org_val.strip(),
                                raw_value=org_val,
                                metadata={"asn": asn_std},
                                source="RDAP/IP",
                                confidence="OBSERVED"
                            ))

                            relationships.append(DiscoveredRelationship(
                                source_type="ASN",
                                source_value=asn_std,
                                target_type="ORGANIZATION",
                                target_value=org_val.strip(),
                                relation_type="operated_by",
                                confidence="OBSERVED",
                                source="RDAP/IP",
                                metadata={"asn": asn_std}
                            ))

        except Exception as e:
            raw_records.append(f"Network lookup error: {str(e)}")

        exec_time = (time.time() - start_time) * 1000.0
        return CollectorResult(
            collector_name=self.name,
            target=clean_target,
            success=len(entities) > 0,
            entities=entities,
            relationships=relationships,
            raw_records=raw_records,
            execution_time_ms=exec_time
        )
