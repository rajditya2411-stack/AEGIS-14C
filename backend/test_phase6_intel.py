import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from unittest.mock import AsyncMock, patch
from app.database import init_db, AsyncSessionLocal
from app.collectors.hibp_collector import HIBPCollector
from app.services.scan_orchestrator import ScanOrchestrator
from app.services.ai_config import save_settings
from app.normalization.engine import resolve_and_ingest_results
from app.schemas import InvestigationCreate
import app.crud as crud

async def test_phase6_threat_intel():
    print("=== TRACE Phase 6 Threat Intel & Leak Monitoring Verification ===")

    # 1. Test HIBPCollector instantiation & ScanOrchestrator registration
    print("\n1. Testing ScanOrchestrator collector registration...")
    orch = ScanOrchestrator()
    collector_names = [c.name for c in orch.collectors]
    print(f"[OK] Total Collectors registered: {len(orch.collectors)}")
    print(f"Collectors: {collector_names}")
    assert "HaveIBeenPwned Threat Intel Collector" in collector_names

    # 2. Test HIBP Collector execution with mocked API response
    print("\n2. Testing HIBPCollector execution with mocked API key...")
    save_settings({"hibp_api_key": "hibp_test_key_12345"})

    collector = HIBPCollector()
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: [
            {"Name": "Adobe", "BreachDate": "2013-10-04", "DataClasses": ["Email", "Password"]},
            {"Name": "Canva", "BreachDate": "2019-05-24", "DataClasses": ["Email", "Password", "Name"]}
        ]
        mock_get.return_value = mock_resp

        res = await collector.collect("john.doe@example.com")
        print(f"[OK] Collection Success: {res.success}")
        print(f"[OK] Entities Discovered: {[e.value for e in res.entities]}")
        assert len(res.entities) == 1
        assert res.entities[0].metadata["has_breach"] is True
        assert "Adobe" in res.entities[0].metadata["breaches"]

    # 3. Test Graph Ingestion & Metadata Persistence
    print("\n3. Testing SQLite Graph Ingestion...")
    await init_db()
    async with AsyncSessionLocal() as db:
        inv = await crud.create_investigation(db, InvestigationCreate(
            title="Breach Threat Case",
            target="john.doe@example.com",
            type="Person of Interest Analysis"
        ))
        stats = await resolve_and_ingest_results(db, inv.id, [res])
        print(f"[OK] Ingestion stats: {stats}")

        graph = await crud.get_graph_data(db, inv.id)
        node_vals = [n.data["label"] for n in graph.nodes]
        print(f"[OK] Graph Nodes: {node_vals}")
        assert "john.doe@example.com" in node_vals

    print("\n=======================================================")
    print("ALL PHASE 6 THREAT INTEL VERIFICATION TESTS PASSED (100%)!")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(test_phase6_threat_intel())
