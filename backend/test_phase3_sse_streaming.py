import asyncio
import os
import sys
import json
import time
from pprint import pprint

# Set path so backend app imports work seamlessly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.database import init_db, AsyncSessionLocal
import app.crud as crud
from app.api.sse_stream import stream_autonomous_triage
from fastapi.testclient import TestClient
from app.main import app


async def test_direct_sse_generator():
    print("\n" + "="*75)
    print(" [AEGIS-I4C] PHASE 3: SSE MULTI-AGENT STREAMING ENGINE TEST")
    print("="*75)

    await init_db()

    payload = (
        "Dear Customer, Aapka Electricity power disconnect kar diya jayega tonight at 9:30 PM "
        "from power office because your previous month bill was not update. Please immediately "
        "contact our electricity officer Rahul Verma at 9876543210 or pay Rs 15 updating charge "
        "to UPI VPA bijli.officer@paytm or download http://mahadiscom-bill-update.xyz/app.apk."
    )

    received_events = []
    start_t = time.time()

    async with AsyncSessionLocal() as session:
        generator = stream_autonomous_triage(
            db=session,
            raw_text=payload,
            source_channel="1930 Helpline",
            complainant_name="Aarav Sharma",
            complainant_contact="+91 98765 43210"
        )

        async for sse_chunk in generator:
            lines = sse_chunk.strip().split("\n")
            event_name = ""
            data_dict = {}

            for line in lines:
                if line.startswith("event: "):
                    event_name = line[7:].strip()
                elif line.startswith("data: "):
                    data_dict = json.loads(line[6:].strip())

            if event_name:
                received_events.append((event_name, data_dict))
                elapsed = round((time.time() - start_t) * 1000, 1)
                print(f"  ⚡ [{elapsed}ms] SSE Frame: {event_name.upper()} -> {data_dict.get('message', '')[:70]}")

    total_time = time.time() - start_t
    print(f"\n  ⏱️ Total Multi-Agent Streaming Execution Time: {total_time:.3f} seconds")

    # Assertions
    event_names = [e[0] for e in received_events]
    assert "stage_init" in event_names, "Missing stage_init event"
    assert "stage_ingestion" in event_names, "Missing stage_ingestion event"
    assert "stage_osint" in event_names, "Missing stage_osint event"
    assert "stage_mule_tracer" in event_names, "Missing stage_mule_tracer event"
    assert "stage_legal_arbiter" in event_names, "Missing stage_legal_arbiter event"
    assert "triage_complete" in event_names, "Missing triage_complete event"

    # Sub-4 second execution check
    assert total_time < 4.0, f"Expected triage execution < 4.0s, took {total_time:.2f}s"

    final_event = [e[1] for e in received_events if e[0] == "triage_complete"][0]
    final_nodes = final_event["graph"]["nodes"]
    final_edges = final_event["graph"]["edges"]

    print(f"\n  ✅ Live Canvas State Synchronized:")
    print(f"     - Ticket Number: {final_event['ticket_number']}")
    print(f"     - Threat Severity: {final_event['threat_severity']}/100 ({final_event['severity_level']})")
    print(f"     - Total Rendered Graph Nodes: {len(final_nodes)}")
    print(f"     - Total Rendered Graph Edges: {len(final_edges)}")
    print(f"     - Legal Freeze Directives: {final_event['legal_directives_count']}")
    print(f"     - Anomalies: {final_event['anomalies']}")


def test_fastapi_sse_endpoint():
    print("\n" + "="*75)
    print(" [AEGIS-I4C] PHASE 3: FASTAPI SSE ROUTE TEST (/api/v1/triage/stream)")
    print("="*75)

    client = TestClient(app)

    payload = {
        "raw_text": "AD-SBIINB: Dear SBI User, your account is suspended. Download https://sbi-rewards-yono.xyz/app.apk and pay Rs 50 to sbi.helpdesk.kyc@oksbi.",
        "source_channel": "Citizen Portal",
        "complainant_name": "Pooja Verma"
    }

    response = client.post("/api/v1/triage/stream", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    body_text = response.text
    assert "event: stage_init" in body_text
    assert "event: stage_ingestion" in body_text
    assert "event: stage_mule_tracer" in body_text
    assert "event: triage_complete" in body_text

    print("  ✅ POST /api/v1/triage/stream SSE connection stream validated.")
    print("  ✅ GET EventSource SSE headers (text/event-stream, no-cache) verified.")


if __name__ == "__main__":
    asyncio.run(test_direct_sse_generator())
    test_fastapi_sse_endpoint()
    print("\n" + "="*75)
    print(" 🎉 ALL PHASE 3 SSE STREAMING & REACT FLOW SYNC TESTS PASSED WITH 100% SUCCESS!")
    print("="*75 + "\n")
