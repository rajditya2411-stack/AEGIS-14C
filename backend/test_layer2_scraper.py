import asyncio
from unittest.mock import AsyncMock, patch
import httpx
from app.database import init_db, AsyncSessionLocal
from app.collectors.web_scraper_collector import WebScraperCollector
from app.collectors.base import DiscoveredEntity, DiscoveredRelationship
from app.normalization.engine import NormalizationEngine, resolve_and_ingest_results
from app.schemas import InvestigationCreate
from app.services.scan_orchestrator import ScanOrchestrator
import app.crud as crud

MOCK_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Test Target Company</title>
    <script src="https://www.googletagmanager.com/gtag/js?id=G-12345678XX"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'UA-98765432-1');
      gtag('config', 'G-12345678XX');
    </script>
</head>
<body>
    <h1>Welcome to Acme Global Security</h1>
    <p>Contact us at <a href="mailto:support@acmesecurity.com">support@acmesecurity.com</a> or <a href="tel:+18005550199">+1 (800) 555-0199</a>.</p>
    
    <footer class="site-footer">
        <p>&copy; 2026 Acme Global Security, Inc. All Rights Reserved. AdSense pub-1234567890123456</p>
    </footer>
</body>
</html>
"""

async def test_layer2_scraper():
    print("--- TRACE Layer 2 Web Scraper Verification ---")

    # 1. Test Normalization Rules for TRACKING_ID and PHONE
    print("\n1. Testing Normalization Engine for Layer 2 entities...")
    assert NormalizationEngine.normalize_value("TRACKING_ID", " ua-98765432-1 ") == "UA-98765432-1"
    assert NormalizationEngine.normalize_value("TRACKING_ID", "g-12345678xx") == "G-12345678XX"
    assert NormalizationEngine.normalize_value("PHONE", "  +1 (800) 555-0199  ") == "+1 (800) 555-0199"
    print("[OK] TRACKING_ID and PHONE normalization rules verified.")

    # 2. Test Collector Parsing Logic using Mock Response
    print("\n2. Testing WebScraperCollector HTML extraction...")
    collector = WebScraperCollector()

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.text = MOCK_HTML
        mock_response.url = "https://acmesecurity.com"
        mock_get.return_value = mock_response

        result = await collector.collect("acmesecurity.com")

        print(f"[OK] Collection success: {result.success}")
        print(f"[OK] Total entities discovered: {len(result.entities)}")
        print(f"[OK] Total relationships discovered: {len(result.relationships)}")

        found_types = {e.entity_type: e.value for e in result.entities}
        print("Discovered Entities:", found_types)

        assert "TRACKING_ID" in found_types, "Expected TRACKING_ID entity"
        assert "EMAIL" in found_types, "Expected EMAIL entity"
        assert "PHONE" in found_types, "Expected PHONE entity"
        assert "ORGANIZATION" in found_types, "Expected ORGANIZATION entity"

        assert found_types["EMAIL"] == "support@acmesecurity.com"

        print("[OK] HTML extraction extracted TRACKING_ID, EMAIL, PHONE, and ORGANIZATION successfully!")

    # 3. Test Graph DB Ingestion and Orchestrator Integration
    print("\n3. Testing DB ingestion and ScanOrchestrator registration...")
    await init_db()
    async with AsyncSessionLocal() as db:
        inv = await crud.create_investigation(db, InvestigationCreate(
            title="Layer 2 Test Investigation",
            target="acmesecurity.com",
            type="Domain Investigation"
        ))

        stats = await resolve_and_ingest_results(db, inv.id, [result])
        print(f"[OK] Ingestion stats: {stats}")

        graph = await crud.get_graph_data(db, inv.id)
        node_types = set(n.data["entity_type"] for n in graph.nodes)
        print(f"[OK] Ingested Nodes ({len(graph.nodes)} total): {node_types}")

        assert "TRACKING_ID" in node_types
        assert "EMAIL" in node_types
        assert "PHONE" in node_types

    print("\n=======================================================")
    print("ALL LAYER 2 WEB SCRAPER VERIFICATION TESTS PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(test_layer2_scraper())
