import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')
from app.database import AsyncSessionLocal, init_db
from app.services.intel_exchange import IntelExchangeService
from app.schemas import InvestigationCreate, IntelBroadcastRequest
import app.crud as crud

async def test_phase5():
    print("=" * 80)
    print(" [AEGIS-I4C] PHASE 5: INTER-AGENCY INTEL EXCHANGE & COORDINATION TEST")
    print("=" * 80)
    await init_db()
    async with AsyncSessionLocal() as db:
        inv = await crud.create_investigation(
            db, 
            InvestigationCreate(title="Phase 5 Inter-Agency Coordination Case", target="phishing-bank-portal.xyz", type="Banking & Phishing Syndicate")
        )
        print(f"[TEST 1] Investigation Initialized: {inv.id}")

        # Seed some indicators
        e1 = await crud.create_entity(db, crud.EntityCreate(
            investigation_id=inv.id,
            entity_type="UPI_VPA",
            value="scammer.mule@icici",
            raw_value="scammer.mule@icici",
            confidence="CONFIRMED"
        ))
        e2 = await crud.create_entity(db, crud.EntityCreate(
            investigation_id=inv.id,
            entity_type="DOMAIN",
            value="phishing-bank-portal.xyz",
            raw_value="phishing-bank-portal.xyz",
            confidence="CONFIRMED"
        ))
        e3 = await crud.create_entity(db, crud.EntityCreate(
            investigation_id=inv.id,
            entity_type="PHONE",
            value="+919811204567",
            raw_value="+919811204567",
            confidence="CONFIRMED"
        ))
        print("  [PASS] Seeded 3 High-Value Indicators (UPI VPA, C2 Domain, Mobile Number).")

        # Test STIX 2.1 Package Generation
        entities = await crud.get_entities_by_investigation(db, inv.id)
        relationships = await crud.get_relationships_by_investigation(db, inv.id)
        stix_bundle = IntelExchangeService.generate_stix_package(inv, entities, relationships)
        assert stix_bundle["type"] == "bundle", "STIX type must be bundle"
        assert len(stix_bundle["objects"]) >= 4, "Report + 3 indicators expected"
        print("  [PASS] STIX 2.1 Threat Intel Bundle Generation:")
        print(f"     - Bundle ID: {stix_bundle['id']}")
        print(f"     - Total Objects in STIX Package: {len(stix_bundle['objects'])}")
        print(f"     - Provenance: {stix_bundle['aegis_provenance']['statutory_compliance']}")

        # Test Inter-Agency Broadcasting
        broadcast_res = IntelExchangeService.broadcast_indicators(
            investigation_id=inv.id,
            investigation_title=inv.title,
            target=inv.target,
            crime_category=inv.type,
            entities=entities,
            target_agencies=["i4c-central", "npci-frauds", "cert-in", "dot-sanchar"]
        )
        assert broadcast_res["success"] is True, "Broadcast must succeed"
        assert len(broadcast_res["agency_deliveries"]) == 4, "4 agencies must be acknowledged"
        print("  [PASS] Inter-Agency Threat Intel Broadcast:")
        print(f"     - Broadcast Receipt ID: {broadcast_res['broadcast_id']}")
        print(f"     - Transmitted IOCs: {broadcast_res['total_iocs_broadcast']}")
        print(f"     - Acknowledged Recipient Nodes: {len(broadcast_res['agency_deliveries'])}")
        print(f"     - Mandatory Action: {broadcast_res['action_required']}")

        # Test Live Intel Feed
        live_feeds = IntelExchangeService.get_live_intel_feed()
        assert len(live_feeds) > 0, "Live feeds must not be empty"
        print("  [PASS] Live Inter-Agency Threat Bulletin Feed:")
        print(f"     - Total Active National Bulletins: {len(live_feeds)}")
        print(f"     - Latest Bulletin: {live_feeds[0]['alert_title']} [{live_feeds[0]['severity']}]")

        # Test Ledger Verification
        await crud.append_audit_ledger_entry(
            db=db,
            investigation_id=inv.id,
            action_type="INTER_AGENCY_INTEL_BROADCAST",
            actor="AEGIS-CYBER-COMMAND",
            data_payload={"broadcast_id": broadcast_res["broadcast_id"]}
        )
        verify_res = await crud.verify_audit_ledger_chain(db, inv.id)
        assert verify_res["chain_status"] == "TAMPER_EVIDENT_VERIFIED", "Chain integrity must be verified"
        print("  [PASS] Cryptographic SHA-256 Merkle Ledger Audit:")
        print(f"     - Total Verified Blocks: {verify_res['total_entries']}")
        print(f"     - Integrity Status: {verify_res['chain_status']}")
        print(f"     - DPDP & Section 63 BSA Compliance: {verify_res['dpdp_compliant']}")

        print("=" * 80)
        print(" ALL PHASE 5 INTER-AGENCY INTEL & COORDINATION TESTS PASSED 100%!")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_phase5())
