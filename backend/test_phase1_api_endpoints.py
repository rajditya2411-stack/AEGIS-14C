import os
import sys
from fastapi.testclient import TestClient

# Set path so backend app imports work seamlessly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["system"] == "AEGIS-I4C Multi-Agent Cyber Crime Triage Engine"
    assert "MHA / I4C" in data["target"]
    print("\n  ✅ /health endpoint verified")

def test_samples_endpoint():
    response = client.get("/api/v1/complaints/samples")
    assert response.status_code == 200
    samples = response.json()
    assert len(samples) >= 4
    assert any("Electricity" in s["title"] for s in samples)
    print("  ✅ /api/v1/complaints/samples endpoint verified")

def test_parse_endpoint():
    payload = {
        "raw_text": "Dear customer, your electricity will be disconnected tonight. Pay Rs 15 to UPI scammer@paytm or call 9876543210 immediately.",
        "source_channel": "1930 Helpline"
    }
    response = client.post("/api/v1/complaints/parse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "scammer@paytm" in data["extracted_iocs"]["upi_vpas"]
    assert "9876543210" in data["extracted_iocs"]["phone_numbers"]
    assert data["threat_severity"] >= 70
    assert len(data["bns_sections"]) >= 1
    print("  ✅ /api/v1/complaints/parse endpoint verified")

def test_ingest_and_ticket_flow():
    payload = {
        "raw_text": "AD-SBIINB: Dear SBI User, your NetBanking account will be blocked. Download https://sbi-rewards-yono.xyz/SBI_Rewards_KYC.apk (SHA256: 8f4e2b1a9c3d7e5f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f) and pay Rs 50 to VPA sbi.helpdesk.kyc@oksbi.",
        "source_channel": "Citizen Portal",
        "complainant_name": "Rohan Gupta"
    }
    response = client.post("/api/v1/complaints/ingest", json=payload)
    assert response.status_code == 200
    ingest_data = response.json()
    ticket = ingest_data["ticket"]
    inv = ingest_data["investigation"]
    graph = ingest_data["graph"]

    assert ticket["ticket_number"].startswith("AEGIS-2026-")
    assert ticket["complainant_name"] == "Rohan Gupta"
    assert len(graph["nodes"]) >= 4
    print(f"  ✅ /api/v1/complaints/ingest endpoint created Ticket {ticket['ticket_number']} with {len(graph['nodes'])} graph nodes")

    # Verify ticket query
    ticket_res = client.get(f"/api/v1/complaints/tickets/{ticket['id']}")
    assert ticket_res.status_code == 200
    assert ticket_res.json()["ticket_number"] == ticket["ticket_number"]
    print(f"  ✅ /api/v1/complaints/tickets/{ticket['id']} lookup verified")

    # Verify audit ledger query
    ledger_res = client.get(f"/api/v1/investigations/{inv['id']}/ledger")
    assert ledger_res.status_code == 200
    ledger_entries = ledger_res.json()
    assert len(ledger_entries) >= 1
    print(f"  ✅ /api/v1/investigations/{inv['id']}/ledger retrieved {len(ledger_entries)} cryptographic entry(s)")


if __name__ == "__main__":
    print("\n" + "="*70)
    print(" [AEGIS-I4C] PHASE 1: REST API INTEGRATION TESTS")
    print("="*70)
    test_health_endpoint()
    test_samples_endpoint()
    test_parse_endpoint()
    test_ingest_and_ticket_flow()
    print("\n" + "="*70)
    print(" 🎉 ALL PHASE 1 REST API TESTS PASSED SUCCESSFULLY!")
    print("="*70 + "\n")
