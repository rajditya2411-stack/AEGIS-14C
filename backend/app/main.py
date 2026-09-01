from fastapi import FastAPI, Depends, HTTPException, status, Query, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from contextlib import asynccontextmanager

from app.database import init_db, get_db
from app.models import User, Investigation, Entity, Relationship, Evidence, Note, Snapshot, IncidentTicket, MuleTransaction, LegalDirective, AuditLedgerEntry
from app.schemas import (
    UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse, PasswordChangeRequest, UserProfileUpdateRequest,
    InvestigationCreate, InvestigationResponse,
    EntityCreate, EntityResponse,
    RelationshipCreate, RelationshipResponse,
    NoteCreate, NoteUpdate, NoteResponse,
    GraphResponse,
    SnapshotCreate, SnapshotResponse, SnapshotDiffResponse,
    TimelineEventResponse,
    ComplaintParseRequest, ComplaintParseResponse, ExtractedIOCs,
    IncidentTicketResponse, ComplaintIngestRequest, ComplaintIngestResponse,
    SampleComplaintItem,
    OSINTInspectRequest, OSINTInspectResponse,
    MuleTraceRequest, MuleTraceResponse, MuleIntelCheckResponse, MuleTransactionResponse,
    AuditLedgerEntryResponse, LegalDirectiveResponse, LedgerVerificationResponse
)
import app.crud as crud
from app.parsers.complaint_parser import ComplaintParser
from app.agents.osint_sentinel import OSINTSentinel
from app.agents.mule_tracer import MuleTracer
from app.agents.threat_intel_store import ThreatIntelStore
from app.api.sse_stream import stream_autonomous_triage
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, get_current_user, get_optional_current_user
)
from app.services.scan_orchestrator import ScanOrchestrator
from app.services.snapshot_service import SnapshotService
from app.services.timeline_service import TimelineService
from app.services.ai_config import get_public_settings, save_settings
from app.services.ai_service import AIService
from app.services.report_service import ReportService
from pydantic import BaseModel as PydanticBase

orchestrator = ScanOrchestrator()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    await init_db()
    yield

app = FastAPI(
    title="AEGIS-I4C Cyber Fraud & Triage Engine API",
    version="1.0.0",
    description="Autonomous Multi-Agent Cyber Crime, Phishing & Financial Fraud Incident Triage Engine for Indian Cyber Cells (MHA / I4C / State Police)",
    lifespan=lifespan
)

# Enable CORS for Next.js / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "online",
        "system": "AEGIS-I4C Multi-Agent Cyber Crime Triage Engine",
        "target": "MHA / I4C / State Cyber Cells",
        "auth": "JWT & PBKDF2 Enabled",
        "supported_channels": ["1930 Helpline", "Citizen Portal", "WhatsApp Helpline", "Cyber Cell FIR", "SMS Gateway"]
    }


# ==========================================
# --- Authentication & User Endpoints ---
# ==========================================

@app.post("/api/v1/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(data: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    
    user = await crud.create_user(
        db=db,
        email=data.email,
        password=data.password,
        display_name=data.display_name or "Recon Analyst",
        role=data.role or "Lead Investigator"
    )
    
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login_user(data: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    user = await crud.get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password, user.salt):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently inactive."
        )
    
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/v1/auth/me", response_model=UserResponse)
async def get_current_user_profile(user: User = Depends(get_current_user)):
    return user

@app.patch("/api/v1/auth/password", response_model=UserResponse)
async def change_user_password(
    data: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(data.current_password, user.hashed_password, user.salt):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed."
        )
    
    updated_user = await crud.update_user_password(db, user, data.new_password)
    return updated_user

@app.patch("/api/v1/auth/profile", response_model=UserResponse)
async def update_user_profile(
    data: UserProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    updated_user = await crud.update_user_profile(
        db, user, display_name=data.display_name, role=data.role
    )
    return updated_user

@app.post("/api/v1/auth/logout")
async def logout_user(user: User = Depends(get_current_user)):
    return {"message": f"User {user.email} session successfully signed out."}


# ==========================================
# --- Investigations Endpoints ---
# ==========================================

@app.post("/api/v1/investigations", response_model=InvestigationResponse, status_code=status.HTTP_201_CREATED)
async def create_new_investigation(
    data: InvestigationCreate,
    user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = user.id if user else None
    inv = await crud.create_investigation(db, data, user_id=user_id)
    return await crud.get_investigation_by_id(db, inv.id)

@app.get("/api/v1/investigations", response_model=List[InvestigationResponse])
async def list_investigations(
    user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = user.id if user else None
    return await crud.get_investigations(db, user_id=user_id)

@app.get("/api/v1/investigations/{inv_id}", response_model=InvestigationResponse)
async def get_investigation(inv_id: str, db: AsyncSession = Depends(get_db)):
    inv = await crud.get_investigation_by_id(db, inv_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv

@app.delete("/api/v1/investigations/{inv_id}")
async def delete_investigation(inv_id: str, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_investigation(db, inv_id)
    if not success:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return {"message": "Investigation deleted"}


# ==========================================
# --- Phase 2: OSINT Scan Trigger Endpoint ---
# ==========================================

@app.post("/api/v1/investigations/{inv_id}/scan")
async def trigger_osint_scan(
    inv_id: str,
    target_override: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        scan_summary = await orchestrator.execute_scan(db, inv_id, target_override)
        return scan_summary
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OSINT Scan execution error: {str(e)}")


# ==========================================
# --- Entities Endpoints ---
# ==========================================

@app.post("/api/v1/entities", response_model=EntityResponse, status_code=status.HTTP_201_CREATED)
async def create_new_entity(data: EntityCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_entity(db, data)

@app.get("/api/v1/investigations/{inv_id}/entities", response_model=List[EntityResponse])
async def list_entities(inv_id: str, db: AsyncSession = Depends(get_db)):
    return await crud.get_entities_by_investigation(db, inv_id)

@app.delete("/api/v1/entities/{entity_id}")
async def delete_entity(entity_id: str, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_entity(db, entity_id)
    if not success:
        raise HTTPException(status_code=404, detail="Entity not found")
    return {"message": "Entity deleted"}


# ==========================================
# --- Relationships Endpoints ---
# ==========================================

@app.post("/api/v1/relationships", response_model=RelationshipResponse, status_code=status.HTTP_201_CREATED)
async def create_new_relationship(data: RelationshipCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_relationship(db, data)

@app.get("/api/v1/investigations/{inv_id}/relationships", response_model=List[RelationshipResponse])
async def list_relationships(inv_id: str, db: AsyncSession = Depends(get_db)):
    return await crud.get_relationships_by_investigation(db, inv_id)

@app.delete("/api/v1/relationships/{rel_id}")
async def delete_relationship(rel_id: str, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_relationship(db, rel_id)
    if not success:
        raise HTTPException(status_code=404, detail="Relationship not found")
    return {"message": "Relationship deleted"}


# ==========================================
# --- Evidence Endpoints ---
# ==========================================

@app.get("/api/v1/investigations/{inv_id}/evidence")
async def list_evidence(inv_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Evidence).order_by(Evidence.observed_at.desc()).limit(100)
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "entity_id": r.entity_id,
            "relationship_id": r.relationship_id,
            "source_name": r.source_name,
            "raw_record": r.raw_record,
            "confidence": r.confidence,
            "observed_at": r.observed_at.isoformat()
        }
        for r in records
    ]


# ==========================================
# --- Graph Visualization Endpoint ---
# ==========================================

@app.get("/api/v1/investigations/{inv_id}/graph", response_model=GraphResponse)
async def get_graph(inv_id: str, db: AsyncSession = Depends(get_db)):
    return await crud.get_graph_data(db, inv_id)


# ==========================================
# --- Notes Endpoints ---
# ==========================================

@app.post("/api/v1/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_new_note(data: NoteCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_note(db, data)

@app.get("/api/v1/investigations/{inv_id}/notes", response_model=List[NoteResponse])
async def list_notes(inv_id: str, db: AsyncSession = Depends(get_db)):
    return await crud.get_notes_by_investigation(db, inv_id)

@app.patch("/api/v1/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, data: NoteUpdate, db: AsyncSession = Depends(get_db)):
    note = await crud.update_note(db, note_id, data)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.delete("/api/v1/notes/{note_id}")
async def delete_note(note_id: str, db: AsyncSession = Depends(get_db)):
    success = await crud.delete_note(db, note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}


# ==========================================
# --- Phase 3: Snapshots Endpoints ---
# ==========================================

@app.post("/api/v1/investigations/{inv_id}/snapshots", response_model=SnapshotResponse, status_code=status.HTTP_201_CREATED)
async def create_snapshot(inv_id: str, data: SnapshotCreate, db: AsyncSession = Depends(get_db)):
    return await SnapshotService.capture_snapshot(db, inv_id, data)

@app.get("/api/v1/investigations/{inv_id}/snapshots", response_model=List[SnapshotResponse])
async def list_snapshots(inv_id: str, db: AsyncSession = Depends(get_db)):
    return await SnapshotService.get_snapshots(db, inv_id)

@app.get("/api/v1/investigations/{inv_id}/snapshots/{snapshot_id}")
async def get_snapshot_details(inv_id: str, snapshot_id: str, db: AsyncSession = Depends(get_db)):
    snap = await SnapshotService.get_snapshot_by_id(db, snapshot_id)
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snap

@app.delete("/api/v1/snapshots/{snapshot_id}")
async def delete_snapshot(snapshot_id: str, db: AsyncSession = Depends(get_db)):
    success = await SnapshotService.delete_snapshot(db, snapshot_id)
    if not success:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return {"message": "Snapshot deleted"}

@app.get("/api/v1/investigations/{inv_id}/snapshots/compare", response_model=SnapshotDiffResponse)
async def compare_snapshots(
    inv_id: str,
    snap_a: str = Query(..., description="ID of the baseline/older snapshot"),
    snap_b: str = Query(..., description="ID of the comparison/newer snapshot"),
    db: AsyncSession = Depends(get_db)
):
    try:
        return await SnapshotService.compare_snapshots(db, snap_a, snap_b)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diff calculation error: {str(e)}")


# ==========================================
# --- Phase 3: Timeline Endpoint ---
# ==========================================

@app.get("/api/v1/investigations/{inv_id}/timeline", response_model=List[TimelineEventResponse])
async def get_investigation_timeline(inv_id: str, db: AsyncSession = Depends(get_db)):
    return await TimelineService.get_investigation_timeline(db, inv_id)


# ==========================================
# --- Phase 4: AI Analysis & BYO-API Endpoints ---
# ==========================================

class AIConfigRequest(PydanticBase):
    provider: Optional[str] = "gemini"
    gemini_api_key: Optional[str] = None
    ollama_url: Optional[str] = "http://localhost:11434"
    ollama_model: Optional[str] = "llama3"
    apify_api_token: Optional[str] = None
    twitter_bearer_token: Optional[str] = None
    instagram_access_token: Optional[str] = None
    hibp_api_key: Optional[str] = None

class AIAnalyzeRequest(PydanticBase):
    user_query: Optional[str] = None

@app.get("/api/v1/ai/config")
async def get_ai_config():
    return get_public_settings()

@app.post("/api/v1/ai/config")
async def update_ai_config(data: AIConfigRequest):
    new_settings = {}
    if data.provider is not None:
        new_settings["provider"] = data.provider
    if data.gemini_api_key is not None:
        new_settings["gemini_api_key"] = data.gemini_api_key
    if data.ollama_url is not None:
        new_settings["ollama_url"] = data.ollama_url
    if data.ollama_model is not None:
        new_settings["ollama_model"] = data.ollama_model
    if data.apify_api_token is not None:
        new_settings["apify_api_token"] = data.apify_api_token
    if data.twitter_bearer_token is not None:
        new_settings["twitter_bearer_token"] = data.twitter_bearer_token
    if data.instagram_access_token is not None:
        new_settings["instagram_access_token"] = data.instagram_access_token
    if data.hibp_api_key is not None:
        new_settings["hibp_api_key"] = data.hibp_api_key
    return save_settings(new_settings)

@app.post("/api/v1/investigations/{inv_id}/ai/analyze")
async def run_ai_analysis(
    inv_id: str,
    data: Optional[AIAnalyzeRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    user_q = data.user_query if data else None
    return await AIService.analyze_investigation(db, inv_id, user_q)


# =========================================================================
# --- AEGIS-I4C: Phase 4 Statutory Legal Notice & Dossier PDF Exporters ---
# =========================================================================

@app.get("/api/v1/investigations/{inv_id}/export/pdf")
async def export_investigation_pdf(inv_id: str, db: AsyncSession = Depends(get_db)):
    """Exports full AEGIS-I4C Forensic Incident & Knowledge Graph Dossier PDF."""
    try:
        pdf_bytes = await ReportService.generate_pdf_report(db, inv_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=AEGIS_Report_{inv_id[:8]}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")


@app.get("/api/v1/investigations/{inv_id}/export/legal-notice")
async def export_legal_freeze_notice_pdf(
    inv_id: str,
    directive_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Exports official court-admissible Section 94 BNSS / Section 66D IT Act
    Statutory Bank Debit Freeze & Lien Order PDF.
    """
    try:
        pdf_bytes = await ReportService.generate_legal_freeze_notice_pdf(db, inv_id, directive_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=BNSS_94_Freeze_Notice_{inv_id[:8]}.pdf"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Legal notice PDF generation error: {str(e)}")



# =========================================================================
# --- AEGIS-I4C: Autonomous Complaint Ingestion & Structured IOC Parser ---
# =========================================================================

SAMPLE_COMPLAINTS = [
    {
        "id": "sample-electricity-hinglish",
        "title": "⚡ Hinglish Electricity Disconnection Phishing",
        "source_channel": "1930 Helpline",
        "category": "Utility / Electricity Disconnection Phishing",
        "payload": "Dear Customer, Aapka Electricity power disconnect kar diya jayega tonight at 9:30 PM from power office because your previous month bill was not update. Please immediately contact our electricity officer Rahul Verma at 9876543210 or pay Rs 15 updating charge to UPI VPA bijli.officer@paytm. Failure to update will lead to legal meter lock."
    },
    {
        "id": "sample-sbi-apk-kyc",
        "title": "🏦 Fake SBI YONO KYC Update APK Phishing",
        "source_channel": "Citizen Portal",
        "category": "Banking KYC & Malicious APK Phishing",
        "payload": "AD-SBIINB: Dear SBI User, your NetBanking account and Debit Card will be blocked in 24 hours due to pending PAN KYC. Download our official KYC Verification App immediately: https://sbi-rewards-yono.xyz/SBI_Rewards_KYC_v3.apk (SHA256: 8f4e2b1a9c3d7e5f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f) and clear pending charges Rs 50 to VPA sbi.helpdesk.kyc@oksbi."
    },
    {
        "id": "sample-digital-arrest-fedex",
        "title": "⚖️ CBI / FedEx 'Digital Arrest' Extortion Call",
        "source_channel": "WhatsApp Helpline",
        "category": "Digital Arrest / Law Enforcement Impersonation Extortion",
        "payload": "URGENT NOTICE: FedEx Parcel #FX-884920 addressed to you from Mumbai to Taiwan has been seized by Customs & Narcotics Control Bureau. 5 passports, 140g MDMA, and 3 credit cards found. CBI Officer Inspector Vikram Rathore issued Arrest Warrant #CBI-2026-9918. You are under 24hr Skype Digital Arrest. Transfer security verification deposit of Rs 1,45,000 to RBI Clearance Escrow VPA rbi.verification.dept@icici immediately to stop immediate police raid at your address."
    },
    {
        "id": "sample-telegram-task-mule",
        "title": "💼 Telegram Part-Time Work-From-Home Task Scam",
        "source_channel": "Cyber Cell FIR",
        "category": "Work-From-Home / Part-Time Task Multi-Tier Fraud",
        "payload": "Earn Rs 3000 to Rs 8000 daily from home! Like YouTube videos and review 5-star hotels on Google Maps. We have deposited initial Rs 500 bonus. To unlock VIP Level 2 high payout tasks, transfer prepaid deposit Rs 15,000 to our merchant gateway target.task@ybl or settle to account 9198765432101 IFSC PYTM0123456. Contact Telegram admin @invest_mentor_pro."
    }
]

@app.get("/api/v1/complaints/samples", response_model=List[SampleComplaintItem])
async def get_sample_complaints():
    """Returns pre-loaded synthetic Indian cyber crime test complaints for quick demo."""
    return SAMPLE_COMPLAINTS


@app.post("/api/v1/complaints/parse", response_model=ComplaintParseResponse)
async def parse_unstructured_complaint(data: ComplaintParseRequest):
    """
    Parses unstructured Hinglish/English citizen complaints, extracting all structured IOCs
    (UPI VPAs, Phones, URLs, Domains, SMS Headers, APK Hashes, Bank Accounts, Monetary Amounts)
    and maps statutory Bharatiya Nyaya Sanhita (BNS 2023) & IT Act 2000 legal clauses.
    """
    parsed = ComplaintParser.parse_complaint(
        raw_text=data.raw_text,
        source_channel=data.source_channel or "1930 Helpline",
        complainant_name=data.complainant_name,
        complainant_contact=data.complainant_contact
    )
    return parsed.to_dict()


@app.post("/api/v1/complaints/ingest", response_model=ComplaintIngestResponse)
async def ingest_complaint_ticket(
    data: ComplaintIngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Ingests raw complaint text, parses IOCs, creates an Investigation & IncidentTicket,
    seeds normalized Entity and Relationship nodes onto the React Flow canvas,
    and initializes an immutable SHA-256 ledger entry.
    """
    user_id = current_user.id if current_user else None
    result = await crud.ingest_complaint_and_seed_graph(
        db=db,
        raw_text=data.raw_text,
        source_channel=data.source_channel or "1930 Helpline",
        complainant_name=data.complainant_name,
        complainant_contact=data.complainant_contact,
        user_id=user_id,
        custom_title=data.investigation_title
    )
    return result


@app.get("/api/v1/complaints/tickets", response_model=List[IncidentTicketResponse])
async def list_incident_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """List all triaged incident tickets."""
    user_id = current_user.id if current_user else None
    return await crud.get_incident_tickets(db, user_id)


@app.get("/api/v1/complaints/tickets/{ticket_id}", response_model=IncidentTicketResponse)
async def get_incident_ticket(ticket_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve an incident ticket by ID or Ticket Number."""
    ticket = await crud.get_incident_ticket_by_id(db, ticket_id)
    if not ticket:
        ticket = await crud.get_incident_ticket_by_number(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Incident ticket not found")
    return ticket


@app.get("/api/v1/investigations/{inv_id}/ledger", response_model=List[AuditLedgerEntryResponse])
async def get_investigation_audit_ledger(inv_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve DPDP Act 2023 compliant SHA-256 audit ledger records for an investigation."""
    entries = await crud.get_audit_ledger_entries(db, investigation_id=inv_id)
    return entries


@app.post("/api/v1/investigations/{inv_id}/ledger/verify", response_model=LedgerVerificationResponse)
async def verify_investigation_ledger_integrity(inv_id: str, db: AsyncSession = Depends(get_db)):
    """
    Cryptographically audits and verifies the SHA-256 Merkle chain integrity of the investigation.
    Validates proof of non-tampering under Section 63 BSA & DPDP Act 2023.
    """
    return await crud.verify_audit_ledger_chain(db, investigation_id=inv_id)


@app.get("/api/v1/investigations/{inv_id}/directives", response_model=List[LegalDirectiveResponse])
async def get_investigation_legal_directives(inv_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve statutory Section 94 BNSS / Section 66D IT Act freeze directives."""
    return await crud.get_legal_directives(db, investigation_id=inv_id)



# =========================================================================
# --- AEGIS-I4C: Phase 2 OSINT Sentinel & UPI Mule-Chain Tracer Endpoints -
# =========================================================================

@app.post("/api/v1/triage/osint", response_model=OSINTInspectResponse)
async def inspect_target_osint(data: OSINTInspectRequest, db: AsyncSession = Depends(get_db)):
    """
    Executes deterministic zero-trust external infrastructure checks:
    Domain age (<30 days flagged), DNS A/MX records, SSL issuer validation,
    DMARC/SPF compliance, and IP geolocation.
    """
    report = await OSINTSentinel.inspect_target(data.target)
    
    # If investigation_id provided, sync discovered infrastructure nodes to graph
    if data.investigation_id:
        for ent in report.get("entities", []):
            try:
                # Add discovered node to investigation
                norm_val = crud.normalize_entity_value(ent["entity_type"], ent["value"])
                existing = await crud.get_entity_by_value(db, data.investigation_id, norm_val)
                if not existing:
                    await crud.create_entity(db, EntityCreate(
                        investigation_id=data.investigation_id,
                        entity_type=ent["entity_type"],
                        value=norm_val,
                        metadata_json=ent.get("metadata", {})
                    ))
            except Exception:
                pass

    return report


@app.post("/api/v1/triage/mule-trace", response_model=MuleTraceResponse)
async def trace_mule_transactions(data: MuleTraceRequest, db: AsyncSession = Depends(get_db)):
    """
    Constructs multi-tier UPI transaction flow graphs. Detects cyclic routing,
    rapid account splitting, and known mule accounts stored in threat intelligence.
    """
    res = await MuleTracer.trace_mule_chain(
        db=db,
        investigation_id=data.investigation_id,
        seed_vpas=data.seed_vpas,
        ticket_id=data.ticket_id
    )
    return res


@app.get("/api/v1/investigations/{inv_id}/transactions", response_model=List[MuleTransactionResponse])
async def get_investigation_transactions(inv_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve all multi-tier mule transactions associated with an investigation."""
    return await crud.get_mule_transactions(db, inv_id)


@app.get("/api/v1/threat-intel/mule-check/{vpa}", response_model=MuleIntelCheckResponse)
async def check_vpa_threat_intel(vpa: str):
    """Checks whether a given UPI VPA is in the I4C known mule blacklist database."""
    return ThreatIntelStore.check_mule_account(vpa)


# =========================================================================
# --- AEGIS-I4C: Phase 3 Server-Sent Events (SSE) Live Streaming Endpoint -
# =========================================================================

@app.post("/api/v1/triage/stream")
async def start_triage_stream_post(
    data: ComplaintIngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Streams live multi-agent triage reasoning steps and real-time React Flow
    graph updates over persistent HTTP Server-Sent Events (SSE) channel under 4 seconds.
    """
    user_id = current_user.id if current_user else None
    return StreamingResponse(
        stream_autonomous_triage(
            db=db,
            raw_text=data.raw_text,
            source_channel=data.source_channel or "1930 Helpline",
            complainant_name=data.complainant_name,
            complainant_contact=data.complainant_contact,
            user_id=user_id
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/v1/triage/stream")
async def start_triage_stream_get(
    raw_text: str = Query(..., min_length=5),
    source_channel: str = Query("1930 Helpline"),
    complainant_name: Optional[str] = Query(None),
    complainant_contact: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    GET EventSource-compatible SSE streaming endpoint for EventSource clients.
    """
    return StreamingResponse(
        stream_autonomous_triage(
            db=db,
            raw_text=raw_text,
            source_channel=source_channel,
            complainant_name=complainant_name,
            complainant_contact=complainant_contact
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )



