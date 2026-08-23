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
from app.api.sse_stream import stream_autonomous_triage
from app.agents.osint_sentinel import OSINTSentinel
from app.agents.mule_tracer import MuleTracer


COMPLAINT_1 = (
    "URGENT COMPLAINT - REGARDING DIGITAL ARREST AND EXTORTION OF RS 4,85,000 UNDER THREAT OF CBI IMPRISONMENT. "
    "Today morning around 10:15 AM I received an urgent call from TRAI SMS Header AD-FEDEXI claiming a illegal parcel "
    "containing 5 passports, 150g MDMA drug, and 3 fake credit cards was seized at Mumbai Customs Terminal 2 addressed to my name. "
    "They immediately transferred the video call to a fake CBI Officer Inspector Rajesh Sharma on Skype who was wearing full police uniform "
    "inside a simulated police station background. He threatened me with Section 308 BNS (Extortion) and Section 66D IT Act arrest unless "
    "I immediately deposited funds into an 'RBI Escrow Verification Account' for forensic audit before 2:00 PM. Panicked, I executed "
    "two immediate IMPS/UPI transfers totaling Rs 4,85,000 to UPI VPA cbi.escrow.verification@icici and secondary layering account "
    "rbi.audit.clearance@oksbi. They also forced me to click a verification link http://cbi-clearance-portal.xyz/verify.php to submit "
    "my Aadhaar and bank details. Later I discovered it was a complete fake digital arrest fraud. Please freeze these accounts immediately!"
)

COMPLAINT_2 = (
    "COMPLAINT FOR HIGH-VALUE FINANCIAL FRAUD, FAKE SEBI TRADING APP AND UPI MULE LAUNDERING OF RS 12,50,000. "
    "I was added to a VIP Stock Market Signal Group on WhatsApp by admins posing as senior analysts from BlackRock Institutional India. "
    "They offered guaranteed 450% returns on pre-IPO allotment of high-growth tech shares. They instructed me to download an application "
    "named 'BlackRock-Trader-Pro.apk' from http://blackrock-india-vip.top/app.apk (SHA256: 7f8e3d2a1b0c9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e). "
    "Upon installing, the app requested SMS accessibility permissions and showed a fake profit dashboard balance of Rs 48,000,000. "
    "To purchase the pre-IPO allocation, I transferred Rs 12,50,000 across multiple UPI VPAs: primary beneficiary blackrock.institutional@paytm, "
    "layering account insider.allocations@ybl, and bank account 918234710928 (IFSC: SBIN0004521). When I tried to withdraw my funds today, "
    "they demanded an additional 20% SEBI tax fee of Rs 2,50,000. I realized my SMS messages were being intercepted by the malicious APK "
    "and my funds stolen. Requesting immediate Section 106 BNSS debit freeze and lien marking across all beneficiary bank accounts."
)


async def main():
    print("\n" + "="*80)
    print(" 🛡️ AEGIS-I4C: REALISTIC CASE INGESTION & OSINT RECONNAISSANCE SUITE")
    print("="*80)

    await init_db()

    cases = [
        {
            "name": "Case 1: CBI Digital Arrest Extortion & Escrow Fraud (₹4,85,000)",
            "text": COMPLAINT_1,
            "channel": "1930 Helpline",
            "complainant": "Vikramaditya Mehta",
            "contact": "+91 98201 94821",
            "domain": "cbi-clearance-portal.xyz"
        },
        {
            "name": "Case 2: Fake SEBI Pre-IPO Trading Scam & Malicious APK (₹12,50,000)",
            "text": COMPLAINT_2,
            "channel": "Citizen Portal",
            "complainant": "Sunita Deshmukh",
            "contact": "+91 99304 81729",
            "domain": "blackrock-india-vip.top"
        }
    ]

    for idx, c in enumerate(cases, 1):
        print(f"\n" + "-"*80)
        print(f" 📌 Ingesting {c['name']}...")
        print(f"    Complainant: {c['complainant']} ({c['contact']}) | Channel: {c['channel']}")
        print(f"-"*80)

        start_t = time.time()
        events = []

        async with AsyncSessionLocal() as db:
            gen = stream_autonomous_triage(
                db=db,
                raw_text=c['text'],
                source_channel=c['channel'],
                complainant_name=c['complainant'],
                complainant_contact=c['contact']
            )

            async for chunk in gen:
                lines = chunk.strip().split("\n")
                event_name = ""
                data_dict = {}
                for line in lines:
                    if line.startswith("event: "):
                        event_name = line[7:].strip()
                    elif line.startswith("data: "):
                        data_dict = json.loads(line[6:].strip())
                if event_name:
                    events.append((event_name, data_dict))

        # Retrieve final complete event
        complete_event = [e[1] for e in events if e[0] == "triage_complete"][0]
        ticket_num = complete_event["ticket_number"]
        inv_id = complete_event["investigation_id"]
        severity = complete_event["threat_severity"]
        level = complete_event["severity_level"]

        print(f"\n  ✅ Triage Stream Completed in {complete_event['total_runtime_ms']/1000:.2f}s:")
        print(f"     • Ticket Number: {ticket_num}")
        print(f"     • Investigation ID: {inv_id}")
        print(f"     • Scam Category: {complete_event['scam_category']}")
        print(f"     • Threat Severity Score: {severity}/100 ({level})")
        print(f"     • Statutory Sections: {', '.join(complete_event['bns_sections'])}")
        print(f"     • Rendered Graph Nodes: {len(complete_event['graph']['nodes'])} nodes, {len(complete_event['graph']['edges'])} edges")

        # Run OSINT Recon probe on target domain
        print(f"\n  🔍 Running Zero-Trust OSINT Sentinel Reconnaissance on: {c['domain']}...")
        osint_report = await OSINTSentinel.inspect_target(c['domain'])

        print(f"  ✅ OSINT Sentinel Audit Report:")
        print(f"     • Domain Target: {osint_report['target']}")
        print(f"     • OSINT Risk Score: {osint_report['risk_score']}/100 ({osint_report['risk_level']})")
        print(f"     • Domain Age: {osint_report['domain_age'].get('age_days', 'N/A')} days (Is New: {osint_report['domain_age'].get('is_new', False)})")
        print(f"     • Email Security (SPF/DMARC): {osint_report['email_security']}")
        print(f"     • SSL Issuer: {osint_report['ssl_info'].get('issuer', 'N/A')}")
        print(f"     • Risk Flags Detected ({len(osint_report['risk_flags'])}):")
        for flag in osint_report['risk_flags']:
            print(f"       - ⚠️ {flag}")

    print("\n" + "="*80)
    print(" 🎉 REALISTIC CASE INGESTION & OSINT PROBING COMPLETE!")
    print("    Both investigation cases have been saved to SQLite and are live in the UI.")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
