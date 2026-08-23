import asyncio
import os
import sys
from pprint import pprint

# Set path so backend app imports work seamlessly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.agents.osint_sentinel import OSINTSentinel
from app.agents.mule_tracer import MuleTracer
from app.agents.threat_intel_store import ThreatIntelStore
from app.database import init_db, AsyncSessionLocal
import app.crud as crud
from fastapi.testclient import TestClient
from app.main import app


async def run_phase2_tests():
    print("\n" + "="*75)
    print(" [AEGIS-I4C] PHASE 2: OSINT SENTINEL & UPI MULE TRACER VERIFICATION")
    print("="*75)

    # -------------------------------------------------------------
    # TEST 1: Deterministic OSINT Sentinel Probing
    # -------------------------------------------------------------
    print("\n[TEST 1] Testing Deterministic OSINT Sentinel on Phishing Domain...")
    phish_target = "sbi-rewards-yono.xyz"
    osint_rep = await OSINTSentinel.inspect_target(phish_target)
    
    assert osint_rep["target"] == "sbi-rewards-yono.xyz"
    assert osint_rep["target_type"] == "DOMAIN"
    assert osint_rep["domain_age"]["is_new"] is True, "Expected <30 days new domain flag"
    assert osint_rep["risk_score"] >= 70, f"Expected risk >= 70, got {osint_rep['risk_score']}"
    assert len(osint_rep["risk_flags"]) >= 2
    print("  ✅ OSINT Sentinel Report Verified:")
    print(f"     - Target: {osint_rep['target']}")
    print(f"     - Risk Score: {osint_rep['risk_score']}/100 ({osint_rep['risk_level']})")
    print(f"     - Domain Age: {osint_rep['domain_age']['age_days']} days (Is New: {osint_rep['domain_age']['is_new']})")
    print(f"     - Risk Flags: {osint_rep['risk_flags']}")
    print(f"     - Execution Time: {osint_rep['execution_time_ms']} ms")

    # -------------------------------------------------------------
    # TEST 2: Threat Intelligence Blacklist Store
    # -------------------------------------------------------------
    print("\n[TEST 2] Testing Threat Intelligence Store Blacklist & Heuristics...")
    intel_hit = ThreatIntelStore.check_mule_account("bijli.officer@paytm")
    assert intel_hit["matched"] is True
    assert intel_hit["details"]["status"] == "CONFIRMED_MULE"
    assert intel_hit["details"]["risk_score"] >= 90
    print(f"  ✅ Known Mule VPA Hit: {intel_hit['details']['vpa']} -> {intel_hit['details']['fraud_type']} (Risk: {intel_hit['details']['risk_score']})")

    intel_heur = ThreatIntelStore.check_mule_account("rbi.verification.official@okaxis")
    assert intel_heur["matched"] is True
    assert intel_heur["confidence"] == "INFERRED"
    print(f"  ✅ Heuristic Mule VPA Flag: {intel_heur['details']['vpa']} -> {intel_heur['details']['fraud_type']}")

    intel_clean = ThreatIntelStore.check_mule_account("regular.citizen@okhdfcbank")
    assert intel_clean["matched"] is False
    assert intel_clean["details"]["risk_score"] <= 40
    print(f"  ✅ Clean Account Verified: {intel_clean['details']['vpa']} (Risk: {intel_clean['details']['risk_score']})")

    # -------------------------------------------------------------
    # TEST 3: Multi-Tier Mule-Chain Graph Tracer & Anomaly Engine
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing Multi-Tier UPI Mule-Chain Tracer & Anomaly Detector...")
    await init_db()

    async with AsyncSessionLocal() as session:
        # First ingest a test complaint to get an investigation
        ingest_res = await crud.ingest_complaint_and_seed_graph(
            db=session,
            raw_text="Urgent power disconnect notice. Pay Rs 15 updating charge to UPI VPA bijli.officer@paytm.",
            source_channel="1930 Helpline"
        )
        inv_id = ingest_res["investigation"]["id"]
        ticket_id = ingest_res["ticket"].id

        # Run Mule Tracer
        trace_res = await MuleTracer.trace_mule_chain(
            db=session,
            investigation_id=inv_id,
            seed_vpas=["bijli.officer@paytm"],
            ticket_id=ticket_id
        )

        assert trace_res["tier_1_count"] >= 1
        assert trace_res["tier_2_count"] >= 1
        assert trace_res["tier_3_count"] >= 1
        assert trace_res["total_transactions"] >= 4
        assert trace_res["anomalies"]["has_cycles"] is True, "Expected cyclic loop anomaly detection"
        assert trace_res["anomalies"]["has_splits"] is True, "Expected rapid split anomaly detection"

        print(f"  ✅ Multi-Tier Mule Tracer Execution:")
        print(f"     - Tier 1 Ingress Accounts: {trace_res['tier_1_count']}")
        print(f"     - Tier 2 Layering Mules: {trace_res['tier_2_count']}")
        print(f"     - Tier 3 Cashout / Exit Accounts: {trace_res['tier_3_count']}")
        print(f"     - Total Transactions Traced: {trace_res['total_transactions']} (INR ₹{trace_res['total_flow_amount']:,})")
        print(f"     - Cyclic Laundering Loops Detected: {len(trace_res['anomalies']['cyclic_loops'])}")
        print(f"     - Rapid Splitting Hubs Detected: {len(trace_res['anomalies']['rapid_splits'])}")

        # Verify DB records
        db_txs = await crud.get_mule_transactions(session, inv_id)
        assert len(db_txs) == trace_res["total_transactions"]
        print(f"  ✅ Database Persistence Verified: {len(db_txs)} transactions saved in SQLite")

    # -------------------------------------------------------------
    # TEST 4: REST API Endpoints Verification
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Phase 2 REST API Endpoints...")
    client = TestClient(app)

    # 1. OSINT Endpoint
    osint_api_res = client.post("/api/v1/triage/osint", json={"target": "sbi-rewards-yono.xyz"})
    assert osint_api_res.status_code == 200
    assert osint_api_res.json()["target"] == "sbi-rewards-yono.xyz"
    print("  ✅ POST /api/v1/triage/osint endpoint verified")

    # 2. Mule Check Endpoint
    mule_check_res = client.get("/api/v1/threat-intel/mule-check/sbi.helpdesk.kyc@oksbi")
    assert mule_check_res.status_code == 200
    assert mule_check_res.json()["matched"] is True
    print("  ✅ GET /api/v1/threat-intel/mule-check/{vpa} verified")

    # 3. Mule Trace Endpoint
    mule_trace_api_res = client.post("/api/v1/triage/mule-trace", json={
        "investigation_id": inv_id,
        "seed_vpas": ["sbi.helpdesk.kyc@oksbi"]
    })
    assert mule_trace_api_res.status_code == 200
    mule_trace_data = mule_trace_api_res.json()
    assert mule_trace_data["total_transactions"] >= 3
    print(f"  ✅ POST /api/v1/triage/mule-trace returned {mule_trace_data['total_transactions']} transactions")

    # 4. Investigation Transactions Endpoint
    inv_tx_res = client.get(f"/api/v1/investigations/{inv_id}/transactions")
    assert inv_tx_res.status_code == 200
    assert len(inv_tx_res.json()) >= 4
    print(f"  ✅ GET /api/v1/investigations/{inv_id}/transactions returned {len(inv_tx_res.json())} transactions")

    print("\n" + "="*75)
    print(" 🎉 ALL PHASE 2 OSINT SENTINEL & MULE TRACER TESTS PASSED WITH 100% SUCCESS!")
    print("="*75 + "\n")


if __name__ == "__main__":
    asyncio.run(run_phase2_tests())
