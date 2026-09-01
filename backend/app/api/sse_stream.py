"""
AEGIS-I4C Server-Sent Events (SSE) Live Multi-Agent Streaming Engine.
Streams real-time agent reasoning steps, IOC extractions, OSINT probes,
UPI mule cascades, and statutory legal directives to the React Flow frontend under 4 seconds.
"""
import asyncio
import json
import time
from typing import AsyncGenerator, Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

import app.crud as crud
from app.parsers.complaint_parser import ComplaintParser, ParsedComplaintResult
from app.agents.osint_sentinel import OSINTSentinel
from app.agents.mule_tracer import MuleTracer
from app.agents.threat_intel_store import ThreatIntelStore


def format_sse(event: str, data: Dict[str, Any]) -> str:
    """Format a standard SSE message string."""
    json_str = json.dumps(data, default=str)
    return f"event: {event}\ndata: {json_str}\n\n"


async def stream_autonomous_triage(
    db: AsyncSession,
    raw_text: str,
    source_channel: str = "1930 Helpline",
    complainant_name: Optional[str] = None,
    complainant_contact: Optional[str] = None,
    user_id: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Asynchronous SSE Generator executing all 4 AEGIS-I4C agent phases in parallel/sequence
    and streaming live state machine updates and graph nodes to the frontend in real-time.
    """
    start_time = time.time()

    # --- STEP 0: INITIALIZATION ---
    yield format_sse("stage_init", {
        "status": "INITIALIZING",
        "stage_index": 0,
        "message": "AEGIS-I4C Autonomous Multi-Agent Engine Initialized",
        "timestamp": time.time(),
        "runtime_ms": 0
    })
    await asyncio.sleep(0.05)

    # --- STEP 1: AGENT 1 - INGESTION & COMPLAINT PARSER ---
    yield format_sse("agent_status", {
        "agent": "Agent 1: Ingestion & Parser",
        "status": "IN_PROGRESS",
        "stage_index": 1,
        "message": "Extracting structured IOCs (UPI VPAs, Phones, URLs, APK Hashes, SMS Headers) from raw complaint...",
        "runtime_ms": round((time.time() - start_time) * 1000, 2)
    })

    # Run Ingestion & Seeding
    ingest_result = await crud.ingest_complaint_and_seed_graph(
        db=db,
        raw_text=raw_text,
        source_channel=source_channel,
        complainant_name=complainant_name,
        complainant_contact=complainant_contact,
        user_id=user_id
    )

    ticket = ingest_result["ticket"]
    inv = ingest_result["investigation"]
    parsed_iocs = ingest_result["parsed_iocs"]
    graph_stage1 = ingest_result["graph"]

    yield format_sse("stage_ingestion", {
        "agent": "Agent 1: Ingestion & Parser",
        "status": "COMPLETED",
        "stage_index": 1,
        "ticket_number": ticket.ticket_number,
        "investigation_id": inv["id"],
        "scam_category": ticket.scam_category,
        "threat_severity": ticket.threat_severity,
        "severity_level": ticket.severity_level,
        "bns_sections": ticket.bns_sections,
        "extracted_iocs": parsed_iocs,
        "graph": {
            "nodes": [n.model_dump() for n in graph_stage1.nodes],
            "edges": [e.model_dump() for e in graph_stage1.edges]
        },
        "message": f"Parsed {len(parsed_iocs.get('upi_vpas', []))} VPAs, {len(parsed_iocs.get('phone_numbers', []))} Phones, {len(parsed_iocs.get('phishing_urls', []))} URLs. Seeded {len(graph_stage1.nodes)} nodes.",
        "runtime_ms": round((time.time() - start_time) * 1000, 2)
    })
    await asyncio.sleep(0.1)

    # --- STEP 2: AGENT 2 - DETERMINISTIC OSINT SENTINEL ---
    yield format_sse("agent_status", {
        "agent": "Agent 2: OSINT Sentinel",
        "status": "IN_PROGRESS",
        "stage_index": 2,
        "message": "Executing zero-trust domain age, DNS SPF/DMARC compliance, and SSL socket validation probes...",
        "runtime_ms": round((time.time() - start_time) * 1000, 2)
    })

    # Run OSINT probes on discovered domains/URLs
    osint_reports = []
    target_domains = parsed_iocs.get("domains", [])
    if not target_domains and parsed_iocs.get("phishing_urls"):
        for u in parsed_iocs["phishing_urls"]:
            d = u.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
            if d:
                target_domains.append(d)

    for domain in target_domains[:3]:  # Top 3 domains
        report = await OSINTSentinel.inspect_target(domain)
        osint_reports.append(report)
        # Sync discovered entities & relationships to investigation
        for ent in report.get("entities", []):
            try:
                norm_val = crud.normalize_entity_value(ent["entity_type"], ent["value"])
                existing = await crud.get_entity_by_value(db, inv["id"], norm_val)
                if not existing:
                    await crud.create_entity(db, crud.EntityCreate(
                        investigation_id=inv["id"],
                        entity_type=ent["entity_type"],
                        value=norm_val,
                        metadata_json=ent.get("metadata", {})
                    ))
            except Exception:
                pass

    # Fetch updated graph after OSINT
    graph_stage2 = await crud.get_graph_data(db, inv["id"])

    yield format_sse("stage_osint", {
        "agent": "Agent 2: OSINT Sentinel",
        "status": "COMPLETED",
        "stage_index": 2,
        "osint_reports": osint_reports,
        "graph": {
            "nodes": [n.model_dump() for n in graph_stage2.nodes],
            "edges": [e.model_dump() for e in graph_stage2.edges]
        },
        "message": f"OSINT Sentinel probed {len(osint_reports)} target(s). Discovered infrastructure nodes. Total canvas nodes: {len(graph_stage2.nodes)}.",
        "runtime_ms": round((time.time() - start_time) * 1000, 2)
    })
    await asyncio.sleep(0.1)

    # --- STEP 3: AGENT 3 - UPI MULE-CHAIN GRAPH TRACER ---
    yield format_sse("agent_status", {
        "agent": "Agent 3: Mule Tracer",
        "status": "IN_PROGRESS",
        "stage_index": 3,
        "message": "Constructing multi-tier UPI mule graph & detecting cyclic transfers and rapid splitting...",
        "runtime_ms": round((time.time() - start_time) * 1000, 2)
    })

    seed_vpas = parsed_iocs.get("upi_vpas", [])
    mule_result = {}
    if seed_vpas:
        mule_result = await MuleTracer.trace_mule_chain(
            db=db,
            investigation_id=inv["id"],
            seed_vpas=seed_vpas,
            ticket_id=ticket.id
        )

    # Fetch updated graph after Mule Tracer
    graph_stage3 = await crud.get_graph_data(db, inv["id"])

    anomalies = mule_result.get("anomalies", {})
    cycle_count = len(anomalies.get("cyclic_loops", []))
    split_count = len(anomalies.get("rapid_splits", []))

    yield format_sse("stage_mule_tracer", {
        "agent": "Agent 3: Mule Tracer",
        "status": "COMPLETED",
        "stage_index": 3,
        "mule_trace": mule_result,
        "anomalies": anomalies,
        "graph": {
            "nodes": [n.model_dump() for n in graph_stage3.nodes],
            "edges": [e.model_dump() for e in graph_stage3.edges]
        },
        "message": f"Mule Tracer mapped {mule_result.get('total_transactions', 0)} transactions (₹{mule_result.get('total_flow_amount', 0):,}). Detected {cycle_count} cyclic loop(s) & {split_count} rapid split(s). Total canvas nodes: {len(graph_stage3.nodes)}.",
        "runtime_ms": round((time.time() - start_time) * 1000, 2)
    })
    await asyncio.sleep(0.1)

    # --- STEP 4: AGENT 4 - STATUTORY LEGAL ARBITER ---
    yield format_sse("agent_status", {
        "agent": "Agent 4: Legal Arbiter",
        "status": "IN_PROGRESS",
        "stage_index": 4,
        "message": "Synthesizing statutory BNS 2023 offenses & drafting Section 94 BNSS / Section 66D IT Act freeze notices...",
        "runtime_ms": round((time.time() - start_time) * 1000, 2)
    })

    # Draft automatic legal freeze directives for identified mule VPAs
    created_directives = []
    for vpa in seed_vpas:
        intel = ThreatIntelStore.check_mule_account(vpa)
        bank_name = intel["details"]["bank"]
        directive = await crud.create_legal_directive(
            db=db,
            data=crud.LegalDirectiveCreate(
                investigation_id=inv["id"],
                ticket_id=ticket.id,
                legal_act="Section 94 BNSS / Section 66D IT Act",
                target_entity_type="UPI_VPA",
                target_entity_value=vpa,
                psp_or_bank=bank_name,
                action_required="IMMEDIATE_DEBIT_FREEZE",
                notice_content=(
                    f"STATUTORY FREEZE DIRECTIVE UNDER SECTION 94 BNSS & SECTION 66D IT ACT\n\n"
                    f"To: Nodal Grievance & Cyber Law Enforcement Officer, {bank_name}\n"
                    f"Case: Incident Ticket #{ticket.ticket_number} (Ref: I4C / 1930 Helpline Triage)\n"
                    f"Target VPA: {vpa}\n"
                    f"Action: IMMEDIATE DEBIT FREEZE & LIEN MARKING\n"
                    f"Grounds: Active cyber crime financial fraud / phishing complaint with high threat severity ({ticket.threat_severity}/100).\n"
                    f"Statutory Offenses: {', '.join(ticket.bns_sections)}\n"
                    f"Authorized By: State Cyber Cell / MHA I4C Autonomous Triage Station\n"
                )
            )
        )
        created_directives.append({
            "directive_number": directive.directive_number,
            "target": vpa,
            "bank": bank_name,
            "status": directive.status
        })

    # Fetch final graph
    final_graph = await crud.get_graph_data(db, inv["id"])
    total_runtime_ms = round((time.time() - start_time) * 1000, 2)

    yield format_sse("stage_legal_arbiter", {
        "agent": "Agent 4: Legal Arbiter",
        "status": "COMPLETED",
        "stage_index": 4,
        "legal_directives": created_directives,
        "bns_sections": ticket.bns_sections,
        "threat_severity": ticket.threat_severity,
        "severity_level": ticket.severity_level,
        "message": f"Drafted {len(created_directives)} Section 94 BNSS bank freeze directive(s). DPDP-compliant ledger updated.",
        "runtime_ms": total_runtime_ms
    })
    await asyncio.sleep(0.05)

    # --- STEP 5: FINAL TRIAGE COMPLETE EVENT ---
    yield format_sse("triage_complete", {
        "status": "COMPLETED",
        "ticket_number": ticket.ticket_number,
        "investigation_id": inv["id"],
        "scam_category": ticket.scam_category,
        "threat_severity": ticket.threat_severity,
        "severity_level": ticket.severity_level,
        "bns_sections": ticket.bns_sections,
        "extracted_iocs": parsed_iocs,
        "legal_directives_count": len(created_directives),
        "total_transactions": mule_result.get("total_transactions", 0),
        "anomalies": anomalies,
        "graph": {
            "nodes": [n.model_dump() for n in final_graph.nodes],
            "edges": [e.model_dump() for e in final_graph.edges]
        },
        "total_runtime_ms": total_runtime_ms,
        "message": f"Triage successfully finished in {total_runtime_ms / 1000:.2f}s with {len(final_graph.nodes)} graph nodes rendered."
    })
