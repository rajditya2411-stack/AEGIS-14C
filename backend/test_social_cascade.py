import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from unittest.mock import AsyncMock, patch
from app.database import init_db, AsyncSessionLocal
from app.services.social_cascade_service import SocialCascadeCollector
from app.collectors.social_mirrors_collector import SocialMirrorsCollector
from app.normalization.engine import resolve_and_ingest_results
from app.services.scan_orchestrator import ScanOrchestrator
from app.services.ai_config import save_settings
from app.schemas import InvestigationCreate
import app.crud as crud

async def test_social_cascade():
    print("=== TRACE Smart Fallback Social Cascade Verification ===")

    # 1. Test SocialMirrorsCollector Username Extraction
    print("\n1. Testing Web Mirrors Username Extraction...")
    col = SocialMirrorsCollector()
    assert col.extract_candidate_username("@elonmusk") == "elonmusk"
    assert col.extract_candidate_username("https://x.com/mrbeast") == "mrbeast"
    print("[OK] Username extraction works across handles and URLs.")

    # 2. Test SocialCascadeCollector Priority Execution
    print("\n2. Testing Tier 3 Web Mirror Default Fallback (0 Keys configured)...")
    cascade_col = SocialCascadeCollector()
    save_settings({"apify_api_token": "", "twitter_bearer_token": "", "instagram_access_token": ""})

    with patch("app.collectors.social_mirrors_collector.SocialMirrorsCollector.collect") as mock_mirror:
        from app.collectors.base import CollectorResult, DiscoveredEntity, DiscoveredRelationship
        mock_mirror.return_value = CollectorResult(
            collector_name="Web Mirrors",
            target="mrbeast",
            success=True,
            entities=[
                DiscoveredEntity(
                    entity_type="URL",
                    value="https://x.com/mrbeast",
                    raw_value="https://x.com/mrbeast",
                    metadata={"platform": "Twitter / X"},
                    source="Web Mirrors"
                ),
                DiscoveredEntity(
                    entity_type="URL",
                    value="https://www.instagram.com/mrbeast/",
                    raw_value="https://www.instagram.com/mrbeast/",
                    metadata={"platform": "Instagram"},
                    source="Web Mirrors"
                )
            ],
            relationships=[]
        )

        res = await cascade_col.collect("mrbeast")
        print(f"[OK] Cascade Result Success: {res.success}")
        print(f"[OK] Entities Discovered: {[e.value for e in res.entities]}")
        assert any("x.com" in e.value for e in res.entities)
        assert any("instagram.com" in e.value for e in res.entities)

    # 3. Test Full Scan Orchestrator Registration (All 8 Collectors)
    print("\n3. Testing ScanOrchestrator Registration...")
    orch = ScanOrchestrator()
    print(f"[OK] Total Collectors registered: {len(orch.collectors)}")
    collector_names = [c.name for c in orch.collectors]
    print(f"Collectors: {collector_names}")
    assert "Smart Fallback Social Cascade (Twitter & Instagram)" in collector_names

    # 4. Test SQLite Graph Ingestion
    print("\n4. Testing SQLite Graph Ingestion...")
    await init_db()
    async with AsyncSessionLocal() as db:
        inv = await crud.create_investigation(db, InvestigationCreate(
            title="Cascade Test Case",
            target="mrbeast",
            type="Username / Persona Reconnaissance"
        ))
        stats = await resolve_and_ingest_results(db, inv.id, [res])
        print(f"[OK] Ingestion stats: {stats}")

        graph = await crud.get_graph_data(db, inv.id)
        node_vals = [n.data["label"] for n in graph.nodes]
        print(f"[OK] Nodes in Graph: {node_vals}")
        assert "mrbeast" in node_vals
        assert any("x.com" in v for v in node_vals)

    print("\n=======================================================")
    print("ALL SMART FALLBACK SOCIAL CASCADE TESTS PASSED (100%)!")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(test_social_cascade())
