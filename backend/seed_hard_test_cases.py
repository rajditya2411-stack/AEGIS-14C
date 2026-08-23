import asyncio
import os
import sys
import json
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.database import init_db, AsyncSessionLocal
import app.crud as crud
from app.api.sse_stream import stream_autonomous_triage
from app.agents.osint_sentinel import OSINTSentinel

COMPLAINT_SOPHISTICATED_1 = (
    "URGENT LAW ENFORCEMENT ESCALATION - HIGH-VALUE DIGITAL ARREST & MULTI-TIER BANK LAUNDERING (₹18,75,000). "
    "On 22-Aug-2026 at 11:30 AM, complainant Rajeshwar Prasad (Director of Logistics, Pune) received a call from TRAI SMS Header "
    "AD-DOTIND claiming his mobile number (+91 98220 11982) was linked to 24 illegal narcotics packages sent via FedEx from Mumbai to Taiwan. "
    "He was immediately forced onto a Skype video conference with fake Narcotics Control Bureau (NCB) Inspector Sameer Wankhede and fake "
    "CBI Officer Inspector Rajesh Sharma. The perpetrators displayed forged Supreme Court arrest warrant #SC-NCB-2026-8812 and threatened "
    "immediate custodial arrest unless funds were transferred into an 'RBI Statutory Forensic Audit Escrow'. "
    "Under extreme intimidation, complainant executed RTGS/IMPS transfers totaling ₹18,75,000 to primary mule account "
    "cbi.forensic.escrow@icici (A/C: 918239018273, IFSC: ICIC0000104) and secondary layering account rbi.clearance.nodal@oksbi. "
    "Complainant was also directed to verify his Aadhaar on fraudulent portal http://ncb-cbi-clearance.org/verify.php. "
    "Requesting immediate Section 106 BNSS debit freeze order to ICICI Bank and SBI Nodal Desks."
)

COMPLAINT_SOPHISTICATED_2 = (
    "COMPLAINT FOR ADVANCED ALGORITHMIC SEBI PRE-IPO FRAUD & SPYWARE APK INTERCEPTION (₹42,50,000). "
    "Complainant Dr. Ananya Sen (Chief Radiologist, Apollo Hospitals, Hyderabad) was targeted via an exclusive LinkedIn connection "
    "by individuals impersonating Goldman Sachs Asset Management India. She was invited into a VIP Telegram Trading Room (@gs_preipo_allocations) "
    "promising early-access allotment in a prominent AI tech IPO at a 60% discount. "
    "She was instructed to download the custom trading application 'GS-Institutional-Trader.apk' from http://goldmansachs-india-vip.top/app.apk "
    "(SHA256: 4e9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a). "
    "The malicious APK installed an accessibility service keylogger that intercepted 2FA OTPs from her mobile device. "
    "Across 3 transactions, she transferred ₹42,50,000 to beneficiary accounts: primary vpa gs.institutional.allotment@paytm, "
    "layering account preipo.escrow.trust@ybl, and beneficiary bank account 00921040001928 (IFSC: HDFC0000092). "
    "When withdrawal was attempted, fraudsters demanded a 15% SEBI capital gains tax of ₹6,37,500. "
    "Immediate debit freeze notice required under Section 106 BNSS and Section 66D IT Act."
)

COMPLAINT_SOPHISTICATED_3 = (
    "CRITICAL ESCALATION - ₹85,00,000 MULTI-TIER INSTITUTIONAL PRE-IPO STOCK MANIPULATION & STRUCTURED MULE NETWORK. "
    "Complainant Vikramaditya Singhania (Managing Director, Apex Pharma Logistics, Ahmedabad) was added into an exclusive "
    "VIP WhatsApp group 'SEBI Institutional Desk - A Grade Allocations' by admin +91 97120 44910 posing as Chief Investment Officer of Morgan Stanley India. "
    "He was guided to register on fake institutional settlement portal https://institutional-sebi-vip.live/terminal.php. "
    "Fraudsters demonstrated synthetic live trading dashboards showing 300% fictitious profits in upcoming defense tech IPO allotment. "
    "Complainant was instructed to execute RTGS transfers of ₹85,00,000 across 4 tranches to purported SEBI clearing escrow accounts: "
    "primary VPA sebi.allotment.settlement@icici (A/C: 50200081928371, IFSC: HDFC0000502), layering account smurf.layer.delta@paytm, "
    "and secondary shell account corporate.treasury.nodal@oksbi. When funds withdrawal was initiated, syndicate demanded ₹12,75,000 "
    "as 'SEBI Advance Tax & Currency Clearance Fee'. Requesting immediate Section 106 BNSS Bank Debit Freeze Notice to HDFC Bank, ICICI Bank, and Paytm Payments Bank."
)

COMPLAINT_SOPHISTICATED_4 = (
    "EMERGENCY CYBER FIR - ₹35,00,000 CORPORATE RTGS HIJACK VIA AEPS BIOMETRIC CLONING & SIM-SWAP INTERCEPTION. "
    "Complainant Meera Nambiar (Chief Financial Officer, Horizon Infotech Solutions, Bangalore) reported unauthorized drainage "
    "of corporate operational funds totaling ₹35,00,000 from current account. On 23-Aug-2026, complainant's registered mobile device "
    "received SMS header AD-UIDAIO advising mandatory biometric re-KYC via spoofed portal https://aeps-aadhaar-portal.net/biometric-sync.php. "
    "The portal prompted download of 'AePS-Biometric-Sync.apk' (SHA256: c8f1e2d3b4a59687e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3). "
    "Simultaneously, a physical clone SIM was activated in Jamtara cluster. Attackers initiated corporate IMPS/RTGS transfers to primary mule VPA "
    "aeps.settlement.escrow@ybl, intermediary layering account mule.layer.swift@okhdfcbank, and P2P crypto exit VPA mule.cashout.crypto@okaxis. "
    "Immediate Section 106 BNSS Freeze Notice required for Yes Bank, HDFC Bank, and Axis Bank Nodal Desks."
)

async def main():
    print("="*80)
    print(" 🧪 HARD-TESTING AEGIS-I4C ENGINE WITH 4 REAL-WORLD HIGH-VALUE FRAUD CASES")
    print("="*80)
    await init_db()

    cases = [
        {
            "name": "Case 1: ₹18.75L Supreme Court / NCB Digital Arrest & RBI Escrow Fraud",
            "text": COMPLAINT_SOPHISTICATED_1,
            "channel": "1930 Helpline",
            "complainant": "Rajeshwar Prasad",
            "contact": "+91 98220 11982",
            "domain": "ncb-cbi-clearance.org"
        },
        {
            "name": "Case 2: ₹42.50L Goldman Sachs Pre-IPO Algorithm & APK Spyware Fraud",
            "text": COMPLAINT_SOPHISTICATED_2,
            "channel": "National Cyber Crime Portal",
            "complainant": "Dr. Ananya Sen",
            "contact": "+91 99490 12384",
            "domain": "goldmansachs-india-vip.top"
        },
        {
            "name": "Case 3: ₹85.00L WhatsApp Institutional Pre-IPO Syndicate & Layered Mule Ring",
            "text": COMPLAINT_SOPHISTICATED_3,
            "channel": "State Police Cyber FIR",
            "complainant": "Vikramaditya Singhania",
            "contact": "+91 97120 44910",
            "domain": "institutional-sebi-vip.live"
        },
        {
            "name": "Case 4: ₹35.00L AePS Biometric Cloning & SIM-Swap Corporate RTGS Hijack",
            "text": COMPLAINT_SOPHISTICATED_4,
            "channel": "1930 Helpline",
            "complainant": "Meera Nambiar",
            "contact": "+91 80881 99201",
            "domain": "aeps-aadhaar-portal.net"
        }
    ]

    for c in cases:
        print(f"\n📌 Ingesting {c['name']}...")
        async with AsyncSessionLocal() as db:
            gen = stream_autonomous_triage(
                db=db,
                raw_text=c['text'],
                source_channel=c['channel'],
                complainant_name=c['complainant'],
                complainant_contact=c['contact']
            )
            events = []
            async for chunk in gen:
                lines = chunk.strip().split("\n")
                event_name, data_dict = "", {}
                for line in lines:
                    if line.startswith("event: "): event_name = line[7:].strip()
                    elif line.startswith("data: "): data_dict = json.loads(line[6:].strip())
                if event_name: events.append((event_name, data_dict))
        
        complete_events = [e[1] for e in events if e[0] == "triage_complete"]
        if complete_events:
            complete_event = complete_events[0]
            print(f"  ✅ Triaged Ticket #{complete_event['ticket_number']} (Inv ID: {complete_event['investigation_id']})")
            print(f"     Threat Severity: {complete_event['threat_severity']}/100 | Nodes: {len(complete_event['graph']['nodes'])}")
        
        print(f"  🔍 Probing OSINT for {c['domain']}...")
        osint_res = await OSINTSentinel.inspect_target(c['domain'])
        print(f"     OSINT Risk Score: {osint_res['risk_score']}/100 ({osint_res['risk_level']})")
        print(f"     Risk Flags: {osint_res['risk_flags']}")

    # Verification summary of total investigations in DB
    async with AsyncSessionLocal() as db:
        invs = await crud.get_investigations(db)
        print("\n" + "="*80)
        print(f" 📊 DATABASE VERIFICATION: TOTAL ACTIVE INVESTIGATION CASES = {len(invs)}")
        print("="*80)
        for i, inv in enumerate(invs):
            print(f"  [{i+1}] {inv['title']} | Target: {inv['target']} | {inv['entity_count']} nodes, {inv['relationship_count']} edges (ID: {inv['id']})")

if __name__ == "__main__":
    asyncio.run(main())
