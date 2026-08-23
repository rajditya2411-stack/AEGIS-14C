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

async def main():
    print("="*80)
    print(" 🧪 HARD-TESTING AEGIS-I4C ENGINE WITH REAL-WORLD HIGH-VALUE FRAUD CASES")
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
        
        complete_event = [e[1] for e in events if e[0] == "triage_complete"][0]
        print(f"  ✅ Triaged Ticket #{complete_event['ticket_number']} (Inv ID: {complete_event['investigation_id']})")
        print(f"     Threat Severity: {complete_event['threat_severity']}/100 | Nodes: {len(complete_event['graph']['nodes'])}")
        
        print(f"  🔍 Probing OSINT for {c['domain']}...")
        osint_res = await OSINTSentinel.inspect_target(c['domain'])
        print(f"     OSINT Risk Score: {osint_res['risk_score']}/100 ({osint_res['risk_level']})")
        print(f"     Risk Flags: {osint_res['risk_flags']}")

if __name__ == "__main__":
    asyncio.run(main())
