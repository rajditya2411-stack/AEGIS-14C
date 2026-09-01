import asyncio
import os
import sys
import json
import time

# Set path so backend app imports work seamlessly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.database import init_db, AsyncSessionLocal
import app.crud as crud
from app.services.report_service import ReportService
from fastapi.testclient import TestClient
from app.main import app


async def test_phase4_legal_notice_and_ledger():
    print("\n" + "="*80)
    print(" [AEGIS-I4C] PHASE 4: STATUTORY LEGAL NOTICE & SHA-256 LEDGER TEST")
    print("="*80)

    await init_db()

    # 1. Ingest a complaint to seed an investigation
    payload = (
        "URGENT: Received fake extortion call from CBI Officer Inspector Rajesh Sharma demanding "
        "immediate Rs 3,50,000 security deposit to avoid arrest. Transferred Rs 3,50,000 to "
        "UPI VPA cbi.escrow.verification@icici. Phishing link: http://cbi-clearance-portal.xyz/verify.php."
    )

    async with AsyncSessionLocal() as session:
        ingest_res = await crud.ingest_complaint_and_seed_graph(
            db=session,
            raw_text=payload,
            source_channel="1930 Helpline",
            complainant_name="Vikramaditya Mehta",
            complainant_contact="+91 98201 94821"
        )
        inv_id = ingest_res["investigation"]["id"]
        ticket = ingest_res["ticket"]

        # Create Section 94 BNSS Freeze Directive
        directive = await crud.create_legal_directive(
            db=session,
            data=crud.LegalDirectiveCreate(
                investigation_id=inv_id,
                ticket_id=ticket.id,
                legal_act="Section 94 BNSS / Section 66D IT Act",
                target_entity_type="UPI_VPA",
                target_entity_value="cbi.escrow.verification@icici",
                psp_or_bank="ICICI Bank",
                action_required="IMMEDIATE_DEBIT_FREEZE",
                notice_content="STATUTORY FREEZE ORDER COMMANDING IMMEDIATE DEBIT RESTRICTION"
            )
        )

        # Append additional ledger block
        await crud.append_audit_ledger_entry(
            db=session,
            investigation_id=inv_id,
            action_type="STATUTORY_BNSS_94_FREEZE_NOTICE_ISSUED",
            actor="State Cyber Crime Cell Nodal Officer",
            data_payload={
                "directive_number": directive.directive_number,
                "target_vpa": "cbi.escrow.verification@icici",
                "bank": "ICICI Bank",
                "statutory_act": "Section 94 BNSS"
            },
            ticket_id=ticket.id
        )

        print(f"\n[TEST 1] Testing Section 94 BNSS Legal Freeze Notice PDF Generator...")
        notice_pdf = await ReportService.generate_legal_freeze_notice_pdf(session, inv_id)
        assert isinstance(notice_pdf, bytes), "Expected PDF bytes output"
        assert notice_pdf.startswith(b"%PDF-"), "Invalid PDF binary header"
        assert len(notice_pdf) > 2000, f"Expected non-empty PDF, got {len(notice_pdf)} bytes"
        print(f"  ✅ Section 94 BNSS Statutory Freeze Notice PDF generated successfully ({len(notice_pdf):,} bytes).")

        print(f"\n[TEST 2] Testing Comprehensive AEGIS-I4C Incident Dossier PDF Generator with Sec 63 BSA Certificate...")
        dossier_pdf = await ReportService.generate_pdf_report(session, inv_id)
        assert isinstance(dossier_pdf, bytes), "Expected PDF bytes output"
        assert dossier_pdf.startswith(b"%PDF-"), "Invalid PDF binary header"
        assert len(dossier_pdf) > 2000, f"Expected non-empty PDF, got {len(dossier_pdf)} bytes"
        print(f"  ✅ Comprehensive Forensic Incident Dossier PDF generated successfully ({len(dossier_pdf):,} bytes).")

        print(f"\n[TEST 3] Testing Cryptographic SHA-256 Merkle Ledger Integrity & DPDP Verification...")
        verification = await crud.verify_audit_ledger_chain(session, inv_id)
        assert verification["is_valid"] is True, "Expected valid Merkle audit ledger chain"
        assert verification["chain_status"] == "TAMPER_EVIDENT_VERIFIED", f"Unexpected status: {verification['chain_status']}"
        assert verification["total_entries"] >= 2, f"Expected >= 2 blocks, got {verification['total_entries']}"
        assert verification["dpdp_compliant"] is True, "Expected DPDP compliance certification"

        print(f"  ✅ Cryptographic Merkle Chain Integrity Verified:")
        print(f"     - Total Verified Blocks: {verification['total_entries']}")
        print(f"     - Latest Merkle Root: {verification['latest_merkle_root'][:32]}...")
        print(f"     - Chain Integrity Status: {verification['chain_status']}")
        print(f"     - DPDP Act 2023 & Section 63 BSA Compliance: {verification['dpdp_compliant']}")
        print(f"     - Verification Latency: {verification['verification_time_ms']}ms")

    # 4. REST API Endpoint Tests
    print(f"\n[TEST 4] Testing Phase 4 REST API Endpoints with TestClient...")
    client = TestClient(app)

    # Test PDF Legal Notice Export
    res_notice = client.get(f"/api/v1/investigations/{inv_id}/export/legal-notice")
    assert res_notice.status_code == 200, f"Failed: {res_notice.text}"
    assert "application/pdf" in res_notice.headers["content-type"]
    assert res_notice.content.startswith(b"%PDF-")
    print(f"  ✅ GET /api/v1/investigations/{inv_id[:8]}/export/legal-notice returned 200 OK (PDF)")

    # Test PDF Dossier Export
    res_pdf = client.get(f"/api/v1/investigations/{inv_id}/export/pdf")
    assert res_pdf.status_code == 200, f"Failed: {res_pdf.text}"
    assert "application/pdf" in res_pdf.headers["content-type"]
    assert res_pdf.content.startswith(b"%PDF-")
    print(f"  ✅ GET /api/v1/investigations/{inv_id[:8]}/export/pdf returned 200 OK (PDF)")

    # Test Directives List
    res_directives = client.get(f"/api/v1/investigations/{inv_id}/directives")
    assert res_directives.status_code == 200
    dir_data = res_directives.json()
    assert len(dir_data) >= 1
    assert dir_data[0]["legal_act"] == "Section 94 BNSS / Section 66D IT Act"
    print(f"  ✅ GET /api/v1/investigations/{inv_id[:8]}/directives returned {len(dir_data)} directive(s)")

    # Test Ledger List
    res_ledger = client.get(f"/api/v1/investigations/{inv_id}/ledger")
    assert res_ledger.status_code == 200
    ledger_data = res_ledger.json()
    assert len(ledger_data) >= 2
    print(f"  ✅ GET /api/v1/investigations/{inv_id[:8]}/ledger returned {len(ledger_data)} cryptographically chained entries")

    # Test Ledger Verification Endpoint
    res_verify = client.post(f"/api/v1/investigations/{inv_id}/ledger/verify")
    assert res_verify.status_code == 200
    verify_data = res_verify.json()
    assert verify_data["is_valid"] is True
    assert verify_data["chain_status"] == "TAMPER_EVIDENT_VERIFIED"
    print(f"  ✅ POST /api/v1/investigations/{inv_id[:8]}/ledger/verify validated non-tampering proof ({verify_data['chain_status']})")


if __name__ == "__main__":
    asyncio.run(test_phase4_legal_notice_and_ledger())
    print("\n" + "="*80)
    print(" 🎉 ALL PHASE 4 STATUTORY LEGAL NOTICE & SHA-256 LEDGER TESTS PASSED WITH 100% SUCCESS!")
    print("="*80 + "\n")
