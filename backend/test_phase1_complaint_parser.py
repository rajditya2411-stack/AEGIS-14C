import asyncio
import os
import sys
from pprint import pprint

# Set path so backend app imports work seamlessly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.parsers.complaint_parser import ComplaintParser
from app.database import init_db, AsyncSessionLocal
import app.crud as crud
from app.schemas import ComplaintParseRequest


async def run_tests():
    print("\n" + "="*70)
    print(" [AEGIS-I4C] PHASE 1: COMPLAINT PARSER & DATABASE SCHEMA VERIFICATION")
    print("="*70)

    # -------------------------------------------------------------
    # TEST 1: Hinglish Electricity Disconnection Phishing Payload
    # -------------------------------------------------------------
    print("\n[TEST 1] Parsing Hinglish Electricity Bill Disconnection Scam...")
    hinglish_payload = (
        "Dear Customer, Aapka Electricity power disconnect kar diya jayega tonight at 9:30 PM "
        "from power office because your previous month bill was not update. Please immediately "
        "contact our electricity officer Rahul Verma at 9876543210 or pay Rs 15 updating charge "
        "to UPI VPA bijli.officer@paytm. Failure to update will lead to legal meter lock."
    )
    res1 = ComplaintParser.parse_complaint(hinglish_payload, source_channel="1930 Helpline")
    assert "bijli.officer@paytm" in res1.upi_vpas, f"Failed to extract UPI VPA: {res1.upi_vpas}"
    assert "9876543210" in res1.phone_numbers, f"Failed to extract phone: {res1.phone_numbers}"
    assert "Utility / Electricity Disconnection Phishing" in res1.scam_category
    assert res1.threat_severity >= 70
    assert any("318(4)" in s for s in res1.bns_sections)
    print("  ✅ Hinglish parser successfully extracted:")
    print(f"     - UPI VPA: {res1.upi_vpas}")
    print(f"     - Phone: {res1.phone_numbers}")
    print(f"     - Category: {res1.scam_category}")
    print(f"     - Severity: {res1.severity_level} ({res1.threat_severity}/100)")
    print(f"     - Statutory Clauses: {res1.bns_sections}")

    # -------------------------------------------------------------
    # TEST 2: Fake Banking KYC APK Phishing with SHA-256 Hash
    # -------------------------------------------------------------
    print("\n[TEST 2] Parsing Fake SBI KYC APK Phishing with SHA-256 Hash...")
    apk_payload = (
        "AD-SBIINB: Dear SBI User, your NetBanking account and Debit Card will be blocked in 24 hours "
        "due to pending PAN KYC. Download our official KYC Verification App immediately: "
        "https://sbi-rewards-yono.xyz/SBI_Rewards_KYC_v3.apk (SHA256: 8f4e2b1a9c3d7e5f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f) "
        "and clear pending charges Rs 50 to VPA sbi.helpdesk.kyc@oksbi."
    )
    res2 = ComplaintParser.parse_complaint(apk_payload, source_channel="Citizen Portal")
    assert "sbi.helpdesk.kyc@oksbi" in res2.upi_vpas, f"Failed to extract UPI VPA: {res2.upi_vpas}"
    assert "8f4e2b1a9c3d7e5f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f" in res2.apk_hashes
    assert "sbi-rewards-yono.xyz" in res2.domains
    assert "AD-SBIINB" in res2.sms_headers
    assert "Banking KYC & Malicious APK Phishing" in res2.scam_category
    assert res2.severity_level == "CRITICAL"
    print("  ✅ APK KYC parser successfully extracted:")
    print(f"     - SMS Header: {res2.sms_headers}")
    print(f"     - APK Hash: {res2.apk_hashes}")
    print(f"     - Phishing Domain: {res2.domains}")
    print(f"     - UPI VPA: {res2.upi_vpas}")
    print(f"     - IT Act Offenses: {res2.it_act_sections}")

    # -------------------------------------------------------------
    # TEST 3: Digital Arrest Extortion Call
    # -------------------------------------------------------------
    print("\n[TEST 3] Parsing Digital Arrest Extortion Scenario...")
    fedex_payload = (
        "URGENT NOTICE: FedEx Parcel #FX-884920 addressed to you from Mumbai to Taiwan has been "
        "seized by Customs & Narcotics Control Bureau. 5 passports, 140g MDMA, and 3 credit cards found. "
        "CBI Officer Inspector Vikram Rathore issued Arrest Warrant #CBI-2026-9918. You are under 24hr "
        "Skype Digital Arrest. Transfer security verification deposit of Rs 1,45,000 to RBI Clearance "
        "Escrow VPA rbi.verification.dept@icici immediately to stop police raid at your address."
    )
    res3 = ComplaintParser.parse_complaint(fedex_payload, source_channel="WhatsApp Helpline")
    assert "rbi.verification.dept@icici" in res3.upi_vpas
    assert "Digital Arrest" in res3.scam_category
    assert res3.threat_severity >= 90
    print("  ✅ Digital Arrest parser successfully extracted:")
    print(f"     - Category: {res3.scam_category}")
    print(f"     - Escrow VPA: {res3.upi_vpas}")
    print(f"     - Amount: {res3.monetary_amounts}")
    print(f"     - Threat Severity: {res3.threat_severity} ({res3.severity_level})")

    # -------------------------------------------------------------
    # TEST 4: Database Schema Initialization & Full Graph Ingestion
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Database Initialization & End-to-End Complaint Ingestion...")
    await init_db()
    print("  ✅ Database initialized and all AEGIS-I4C tables created.")

    async with AsyncSessionLocal() as session:
        result = await crud.ingest_complaint_and_seed_graph(
            db=session,
            raw_text=apk_payload,
            source_channel="Citizen Portal",
            complainant_name="Vikramaditya Roy",
            complainant_contact="+91 9988776655"
        )
        ticket = result["ticket"]
        inv = result["investigation"]
        graph = result["graph"]
        
        assert ticket.ticket_number.startswith("AEGIS-2026-")
        assert len(graph.nodes) >= 4, f"Expected >= 4 graph nodes, got {len(graph.nodes)}"
        assert len(graph.edges) >= 3, f"Expected >= 3 graph edges, got {len(graph.edges)}"

        # Check entity types in the generated graph
        node_types = [n.data["entity_type"] for n in graph.nodes]
        print(f"     - Ticket Number: {ticket.ticket_number}")
        print(f"     - Investigation ID: {inv['id']}")
        print(f"     - Graph Nodes Generated ({len(graph.nodes)}): {node_types}")
        print(f"     - Graph Edges Generated ({len(graph.edges)}): {[e.label for e in graph.edges]}")

        # Check Audit Ledger
        ledger = await crud.get_audit_ledger_entries(session, investigation_id=inv["id"])
        assert len(ledger) >= 1, "Expected initial SHA-256 audit ledger record"
        print(f"     - Initial SHA-256 Ledger Merkle Hash: {ledger[0].merkle_hash[:16]}... (DPDP Compliant: {ledger[0].dpdp_compliance})")

    print("\n" + "="*70)
    print(" 🎉 ALL PHASE 1 COMPLAINT PARSER & DATABASE TESTS PASSED WITH 100% SUCCESS!")
    print("="*70 + "\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
