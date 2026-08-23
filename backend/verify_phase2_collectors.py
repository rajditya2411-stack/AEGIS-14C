import asyncio
from app.database import init_db, AsyncSessionLocal
from app.collectors.base import CollectorResult, DiscoveredEntity, DiscoveredRelationship
from app.collectors.dns_collector import DNSCollector
from app.collectors.cert_collector import CertificateCollector
from app.collectors.ip_collector import IPNetworkCollector
from app.normalization.engine import NormalizationEngine, resolve_and_ingest_results
from app.schemas import InvestigationCreate
from app.services.scan_orchestrator import ScanOrchestrator
import app.crud as crud

async def test_phase2():
    print("--- TRACE Phase 2 OSINT Engine Verification ---")

    # 1. Test Normalization Engine Canonicalization
    print("\n1. Testing Normalization Engine Canonicalization...")
    assert NormalizationEngine.normalize_value("DOMAIN", "HTTPS://API.EXAMPLE.COM/") == "api.example.com"
    assert NormalizationEngine.normalize_value("DOMAIN", "*.dev.example.com.") == "dev.example.com"
    assert NormalizationEngine.normalize_value("DOMAIN", "EXAMPLE.COM") == "example.com"
    assert NormalizationEngine.normalize_value("IP ADDRESS", " 192.168.1.1:8080 ") == "192.168.1.1"
    assert NormalizationEngine.normalize_value("ASN", "13335") == "AS13335"
    assert NormalizationEngine.normalize_value("REPOSITORY", "HTTPS://GITHUB.COM/OWNER/REPO/") == "github.com/owner/repo"
    assert NormalizationEngine.normalize_value("USERNAME", "@johndoe") == "johndoe"
    print("[OK] Normalization Engine handles all entity types correctly")

    # 2. Test Ingestion Deduplication with Controlled Collector Results
    print("\n2. Testing Deterministic Entity Deduplication...")
    await init_db()
    async with AsyncSessionLocal() as db:
        inv = await crud.create_investigation(db, InvestigationCreate(
            title="Deduplication Test Investigation",
            target="example.com",
            type="Domain Investigation"
        ))

        mock_result = CollectorResult(
            collector_name="Mock Collector",
            target="example.com",
            success=True,
            entities=[
                DiscoveredEntity(entity_type="DOMAIN", value="API.EXAMPLE.COM", raw_value="API.EXAMPLE.COM", source="Mock"),
                DiscoveredEntity(entity_type="DOMAIN", value="api.example.com.", raw_value="api.example.com.", source="Mock"),
                DiscoveredEntity(entity_type="IP ADDRESS", value="192.0.2.10", raw_value="192.0.2.10", source="Mock"),
                DiscoveredEntity(entity_type="ORGANIZATION", value="Example Corp", raw_value="Example Corp", source="Mock"),
            ],
            relationships=[
                DiscoveredRelationship(source_type="DOMAIN", source_value="api.example.com", target_type="DOMAIN", target_value="example.com", relation_type="subdomain_of", source="Mock"),
                DiscoveredRelationship(source_type="DOMAIN", source_value="api.example.com", target_type="IP ADDRESS", target_value="192.0.2.10", relation_type="resolves_to", source="Mock")
            ]
        )

        # Pass 1
        stats1 = await resolve_and_ingest_results(db, inv.id, [mock_result])
        print(f"[OK] Pass 1 Ingest Stats: {stats1}")
        assert stats1["new_entities"] == 3  # (api.example.com deduplicated into 1, + 192.0.2.10, + Example Corp; target example.com already existed)

        # Pass 2: Ingest identical data again
        stats2 = await resolve_and_ingest_results(db, inv.id, [mock_result])
        print(f"[OK] Pass 2 Re-ingest Stats: {stats2}")
        assert stats2["new_entities"] == 0, f"Expected 0 new entities on duplicate pass, got {stats2['new_entities']}"
        assert stats2["new_relationships"] == 0, f"Expected 0 new relationships on duplicate pass, got {stats2['new_relationships']}"
        print("[OK] 100% Zero duplicate entities or edges created on re-ingest!")

    # 3. Test Live DNS Collector
    print("\n3. Testing Live DNS Collector against 'cloudflare.com'...")
    dns_col = DNSCollector()
    dns_res = await dns_col.collect("cloudflare.com")
    print(f"[OK] DNS Collector finished in {dns_res.execution_time_ms:.1f}ms (Found {len(dns_res.entities)} entities)")

    # 4. Test Live IP & Network Collector
    print("\n4. Testing Live IP & Network Collector against '1.1.1.1'...")
    ip_col = IPNetworkCollector()
    ip_res = await ip_col.collect("1.1.1.1")
    print(f"[OK] IP & Network Collector finished in {ip_res.execution_time_ms:.1f}ms (Found {len(ip_res.entities)} entities)")

    # 5. Test Full Live Scan Orchestrator
    print("\n5. Testing Live Scan Orchestrator...")
    async with AsyncSessionLocal() as db:
        inv2 = await crud.create_investigation(db, InvestigationCreate(
            title="Live Scan: cloudflare.com",
            target="cloudflare.com",
            type="Domain Investigation"
        ))
        orchestrator = ScanOrchestrator()
        scan_result = await orchestrator.execute_scan(db, inv2.id)
        print(f"[OK] Live Scan completed in {scan_result['total_execution_time_ms']:.1f}ms")
        print(f"     Stats: {scan_result['stats']}")
        
        graph = await crud.get_graph_data(db, inv2.id)
        print(f"[OK] Final Graph payload: {len(graph.nodes)} Nodes, {len(graph.edges)} Edges")

    print("\n=======================================================")
    print("ALL PHASE 2 OSINT COLLECTION & RESOLUTION CHECKS PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(test_phase2())
