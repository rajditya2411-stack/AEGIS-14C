import asyncio
import time
import ssl
import socket
import re
from typing import List, Set, Dict, Any, Optional
import httpx

from app.collectors.base import BaseCollector, CollectorResult, DiscoveredEntity, DiscoveredRelationship

# Knowledge base for major corporate holdings to ensure instant, reliable corporate hierarchy graph nodes
WELL_KNOWN_HOLDINGS: Dict[str, Dict[str, Any]] = {
    "google": {
        "organization": "Google LLC / Alphabet Inc.",
        "assets": ["youtube.com", "android.com", "doubleclick.net", "waymo.com", "deepmind.com"]
    },
    "amazon": {
        "organization": "Amazon.com, Inc.",
        "assets": ["twitch.tv", "imdb.com", "audible.com", "primevideo.com"]
    },
    "facebook": {
        "organization": "Meta Platforms, Inc.",
        "assets": ["instagram.com", "whatsapp.com", "oculus.com"]
    },
    "meta": {
        "organization": "Meta Platforms, Inc.",
        "assets": ["instagram.com", "whatsapp.com", "oculus.com", "facebook.com"]
    },
    "microsoft": {
        "organization": "Microsoft Corporation",
        "assets": ["github.com", "linkedin.com", "xbox.com", "skype.com"]
    },
    "apple": {
        "organization": "Apple Inc.",
        "assets": ["shazam.com", "icloud.com", "apple-dns.net"]
    },
    "cloudflare": {
        "organization": "Cloudflare, Inc.",
        "assets": ["1.1.1.1", "cdnjs.com", "workers.dev"]
    }
}

class RelatedDomainsCollector(BaseCollector):
    name = "Related Assets & Corporate Hierarchy Collector"

    async def collect(self, target: str) -> CollectorResult:
        start_time = time.time()
        entities: List[DiscoveredEntity] = []
        relationships: List[DiscoveredRelationship] = []
        raw_records: List[str] = []
        seen_entities: Set[str] = set()

        # Clean target domain and extract brand keyword
        clean_target = re.sub(r"^https?://", "", target, flags=re.IGNORECASE).split("/")[0].split(":")[0].strip().lower()
        if not clean_target:
            return CollectorResult(
                collector_name=self.name,
                target=target,
                success=False,
                error="Invalid target domain"
            )

        parts = clean_target.split(".")
        brand = parts[0] if len(parts) >= 2 else clean_target
        if brand in ["www", "api", "mail", "dev"] and len(parts) > 2:
            brand = parts[1]

        # 1. Check Well-Known Corporate Holdings (Instant & 100% Reliable)
        if brand in WELL_KNOWN_HOLDINGS:
            holding_info = WELL_KNOWN_HOLDINGS[brand]
            org_name = holding_info["organization"]
            
            # Add Parent Organization
            if org_name not in seen_entities:
                seen_entities.add(org_name)
                entities.append(DiscoveredEntity(
                    entity_type="ORGANIZATION",
                    value=org_name,
                    raw_value=org_name,
                    source="Corporate Knowledge Base",
                    confidence="CONFIRMED",
                    metadata={"type": "Parent Holding Corporation"}
                ))
                relationships.append(DiscoveredRelationship(
                    source_type="DOMAIN",
                    source_value=clean_target,
                    target_type="ORGANIZATION",
                    target_value=org_name,
                    relation_type="owned_by",
                    confidence="CONFIRMED",
                    source="Corporate Knowledge Base"
                ))
                raw_records.append(f"Corporate Hierarchy: {clean_target} is owned by {org_name}")

            # Add Sister / Subsidiary Assets
            for asset in holding_info["assets"]:
                asset_clean = asset.strip().lower()
                if asset_clean != clean_target and asset_clean not in seen_entities:
                    seen_entities.add(asset_clean)
                    e_type = "DOMAIN" if not re.match(r"^\d+\.\d+\.\d+\.\d+$", asset_clean) else "IP ADDRESS"
                    entities.append(DiscoveredEntity(
                        entity_type=e_type,
                        value=asset_clean,
                        raw_value=asset,
                        source="Corporate Knowledge Base",
                        confidence="CONFIRMED",
                        metadata={"parent_company": org_name, "relationship": "Sister Asset / Subsidiary"}
                    ))
                    relationships.append(DiscoveredRelationship(
                        source_type="ORGANIZATION",
                        source_value=org_name,
                        target_type=e_type,
                        target_value=asset_clean,
                        relation_type="owns",
                        confidence="CONFIRMED",
                        source="Corporate Knowledge Base"
                    ))
                    raw_records.append(f"Corporate Asset: {org_name} owns {asset_clean}")

        # 2. Query Wikidata Public Knowledge Graph
        try:
            wiki_results = await self._query_wikidata_corporate(brand)
            for org_name, related_sites in wiki_results.items():
                if org_name not in seen_entities:
                    seen_entities.add(org_name)
                    entities.append(DiscoveredEntity(
                        entity_type="ORGANIZATION",
                        value=org_name,
                        raw_value=org_name,
                        source="Wikidata Knowledge Graph",
                        confidence="CONFIRMED",
                        metadata={"type": "Parent / Holding Organization"}
                    ))
                    relationships.append(DiscoveredRelationship(
                        source_type="DOMAIN",
                        source_value=clean_target,
                        target_type="ORGANIZATION",
                        target_value=org_name,
                        relation_type="owned_by",
                        confidence="CONFIRMED",
                        source="Wikidata"
                    ))

                for site in related_sites:
                    site_clean = re.sub(r"^https?://", "", site, flags=re.IGNORECASE).split("/")[0].strip().lower()
                    if site_clean and site_clean != clean_target and site_clean not in seen_entities:
                        seen_entities.add(site_clean)
                        entities.append(DiscoveredEntity(
                            entity_type="DOMAIN",
                            value=site_clean,
                            raw_value=site,
                            source="Wikidata Knowledge Graph",
                            confidence="CONFIRMED",
                            metadata={"parent_company": org_name, "relationship": "Subsidiary"}
                        ))
                        relationships.append(DiscoveredRelationship(
                            source_type="ORGANIZATION",
                            source_value=org_name,
                            target_type="DOMAIN",
                            target_value=site_clean,
                            relation_type="owns",
                            confidence="CONFIRMED",
                            source="Wikidata"
                        ))
        except Exception as e:
            raw_records.append(f"Wikidata lookup notice: {str(e)}")

        # 3. Extract SSL Certificate SANs
        try:
            sans = await self._fetch_ssl_sans(clean_target)
            for san in sans:
                san_clean = san.lstrip("*.").lower()
                if san_clean and san_clean != clean_target and san_clean not in seen_entities:
                    seen_entities.add(san_clean)
                    entities.append(DiscoveredEntity(
                        entity_type="DOMAIN",
                        value=san_clean,
                        raw_value=san,
                        source="SSL Certificate SAN",
                        confidence="CONFIRMED",
                        metadata={"origin": "Shared SSL Certificate", "san": san}
                    ))
                    relationships.append(DiscoveredRelationship(
                        source_type="DOMAIN",
                        source_value=clean_target,
                        target_type="DOMAIN",
                        target_value=san_clean,
                        relation_type="shares_certificate_with",
                        confidence="CONFIRMED",
                        source="SSL Certificate SAN"
                    ))
                    raw_records.append(f"SSL SAN: {clean_target} shares security certificate with {san_clean}")
        except Exception as e:
            raw_records.append(f"SSL SAN notice: {str(e)}")

        exec_time = (time.time() - start_time) * 1000.0
        return CollectorResult(
            collector_name=self.name,
            target=target,
            success=True,
            entities=entities,
            relationships=relationships,
            raw_records=raw_records,
            execution_time_ms=exec_time
        )

    async def _fetch_ssl_sans(self, domain: str) -> List[str]:
        """Connects via SSL and retrieves Subject Alternative Names (SANs)"""
        sans: List[str] = []

        def _get_cert_sync():
            # Use SSL context to inspect server certificate
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with socket.create_connection((domain, 443), timeout=3.0) as sock:
                with ctx.wrap_socket(sock, server_hostname=domain) as sslsock:
                    # In python, sslsock.getpeercert() returns None/dict depending on handshake
                    cert = sslsock.getpeercert()
                    return cert

        try:
            cert = await asyncio.to_thread(_get_cert_sync)
            if cert and "subjectAltName" in cert:
                for typ, val in cert["subjectAltName"]:
                    if typ == "DNS":
                        sans.append(val)
        except Exception:
            pass

        return list(dict.fromkeys(sans))[:10]

    async def _query_wikidata_corporate(self, brand: str) -> Dict[str, List[str]]:
        """Queries Wikidata public API for company name, parent organization, and subsidiaries"""
        results: Dict[str, List[str]] = {}

        headers = {
            "User-Agent": "TraceOSINT/2.0 (Open-Source Research Tool; contact@tracex.local)"
        }

        async with httpx.AsyncClient(timeout=3.0, headers=headers) as client:
            search_url = f"https://www.wikidata.org/w/api.php?action=wbsearchentities&search={brand}&language=en&format=json&limit=1"
            res = await client.get(search_url)
            if res.status_code != 200:
                return results

            search_data = res.json()
            items = search_data.get("search", [])
            if not items:
                return results

            entity_id = items[0]["id"]
            entity_label = items[0].get("label", brand.capitalize())

            claims_url = f"https://www.wikidata.org/w/api.php?action=wbgetclaims&entity={entity_id}&format=json"
            claims_res = await client.get(claims_url)
            if claims_res.status_code != 200:
                return results

            claims_data = claims_res.json().get("claims", {})
            
            subsidiary_ids = []
            if "P355" in claims_data:
                for claim in claims_data["P355"][:4]:
                    sub_id = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id")
                    if sub_id:
                        subsidiary_ids.append(sub_id)

            sister_websites = []
            if subsidiary_ids:
                entities_url = f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids={'|'.join(subsidiary_ids)}&props=claims&format=json"
                sub_res = await client.get(entities_url)
                if sub_res.status_code == 200:
                    sub_entities = sub_res.json().get("entities", {})
                    for sid, s_data in sub_entities.items():
                        s_claims = s_data.get("claims", {})
                        if "P856" in s_claims:
                            for web_claim in s_claims["P856"]:
                                url = web_claim.get("mainsnak", {}).get("datavalue", {}).get("value")
                                if url:
                                    sister_websites.append(url)

            if sister_websites:
                results[entity_label] = sister_websites

        return results
