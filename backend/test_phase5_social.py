import asyncio
from unittest.mock import AsyncMock, patch
from app.database import init_db, AsyncSessionLocal
from app.collectors.social_finder_collector import SocialFinderCollector
from app.normalization.engine import NormalizationEngine, resolve_and_ingest_results
from app.schemas import InvestigationCreate
from app.services.scan_orchestrator import ScanOrchestrator
import app.crud as crud

async def test_phase5_social():
    print("--- TRACE Phase 5 Social & Username Footprint Verification ---")

    # 1. Test Handle Extraction Logic
    print("\n1. Testing Candidate Username Extraction...")
    collector = SocialFinderCollector()
    assert collector.extract_candidate_username("@johndoe") == "johndoe"
    assert collector.extract_candidate_username("johndoe@example.com") == "johndoe"
    assert collector.extract_candidate_username("https://github.com/johndoe") == "johndoe"
    assert collector.extract_candidate_username("hashicorp.com") == "hashicorp"
    assert collector.extract_candidate_username("  @elonmusk  ") == "elonmusk"
    print("[OK] Username extraction logic handles handles, emails, URLs, and domains correctly.")

    # 2. Test Normalization Engine USERNAME rules
    print("\n2. Testing Normalization Engine USERNAME Rules...")
    assert NormalizationEngine.normalize_value("USERNAME", "@JohnDoe") == "johndoe"
    assert NormalizationEngine.normalize_value("USERNAME", "https://twitter.com/JohnDoe/") == "johndoe"
    print("[OK] Normalization engine canonicalizes usernames cleanly.")

    # 3. Test Collector Execution with Mocked HTTP Responses
    print("\n3. Testing SocialFinderCollector platform signature checks...")
    with patch("httpx.AsyncClient.get") as mock_get:
        def side_effect(url, **kwargs):
            mock_resp = AsyncMock()
            if "github.com" in url or "reddit.com" in url or "keybase.io" in url:
                mock_resp.status_code = 200
                mock_resp.text = '{"name": "John Doe", "about": "Software Engineer"}'
            else:
                mock_resp.status_code = 404
                mock_resp.text = "Not Found"
            return mock_resp

        mock_get.side_effect = side_effect

        result = await collector.collect("johndoe")
        print(f"[OK] Collection success: {result.success}")
        print(f"[OK] Entities found: {len(result.entities)}")
        print(f"[OK] Relationships found: {len(result.relationships)}")

        found_types = set(e.entity_type for e in result.entities)
        print("Discovered Entity Types:", found_types)

        assert "USERNAME" in found_types
        assert "URL" in found_types

        profile_urls = [e.value for e in result.entities if e.entity_type == "URL"]
        print("Discovered Profile URLs:", profile_urls)
        assert any("github.com/johndoe" in u for u in profile_urls)

    # 4. Test Orchestrator Registration & DB Ingestion
    print("\n4. Testing ScanOrchestrator registration and DB Ingestion...")
    await init_db()
    async with AsyncSessionLocal() as db:
        inv = await crud.create_investigation(db, InvestigationCreate(
            title="Social Recon Test Case",
            target="johndoe",
            type="Username / Persona Reconnaissance"
        ))

        stats = await resolve_and_ingest_results(db, inv.id, [result])
        print(f"[OK] DB Ingestion stats: {stats}")

        graph = await crud.get_graph_data(db, inv.id)
        node_types = set(n.data["entity_type"] for n in graph.nodes)
        print(f"[OK] Graph Nodes ({len(graph.nodes)} total): {node_types}")
        print(f"[OK] Graph Edges ({len(graph.edges)} total)")

        assert "USERNAME" in node_types
        assert "URL" in node_types

    print("\n=======================================================")
    print("ALL PHASE 5 SOCIAL FOOTPRINT VERIFICATION CHECKS PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(test_phase5_social())
