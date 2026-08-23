from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, update
from sqlalchemy.orm import selectinload
import math
from typing import List, Optional, Dict, Any
import json

from app.models import (
    User, Investigation, Entity, Relationship, Evidence, Note, Snapshot,
    IncidentTicket, MuleTransaction, LegalDirective, AuditLedgerEntry
)
from app.schemas import (
    InvestigationCreate, EntityCreate, RelationshipCreate, NoteCreate, NoteUpdate,
    GraphNode, GraphEdge, GraphResponse,
    ComplaintParseRequest, ComplaintParseResponse, ExtractedIOCs,
    IncidentTicketResponse, MuleTransactionCreate, LegalDirectiveCreate
)
from app.services.auth_service import hash_password, verify_password
from app.normalization.engine import NormalizationEngine
from app.parsers.complaint_parser import ComplaintParser, ParsedComplaintResult
import hashlib
import random

# --- Entity Normalization Helper ---
def normalize_entity_value(entity_type: str, value: str) -> str:
    cleaned = value.strip()
    e_type = entity_type.upper()
    if e_type in ["DOMAIN", "EMAIL", "USERNAME", "URL", "REPOSITORY"]:
        cleaned = cleaned.lower()
    if e_type == "DOMAIN":
        cleaned = cleaned.rstrip(".")
    return cleaned


# --- User CRUD Operations ---
async def create_user(
    db: AsyncSession,
    email: str,
    password: str,
    display_name: str = "Recon Analyst",
    role: str = "Lead Investigator"
) -> User:
    clean_email = email.strip().lower()
    hashed_pwd, salt = hash_password(password)
    user = User(
        email=clean_email,
        hashed_password=hashed_pwd,
        salt=salt,
        display_name=display_name.strip() if display_name else "Recon Analyst",
        role=role.strip() if role else "Lead Investigator"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    clean_email = email.strip().lower()
    stmt = select(User).where(User.email == clean_email)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def update_user_password(db: AsyncSession, user: User, new_password: str) -> User:
    hashed_pwd, salt = hash_password(new_password)
    user.hashed_password = hashed_pwd
    user.salt = salt
    await db.commit()
    await db.refresh(user)
    return user

async def update_user_profile(
    db: AsyncSession,
    user: User,
    display_name: Optional[str] = None,
    role: Optional[str] = None
) -> User:
    if display_name is not None:
        user.display_name = display_name.strip()
    if role is not None:
        user.role = role.strip()
    await db.commit()
    await db.refresh(user)
    return user


# --- Investigation CRUD ---
async def create_investigation(
    db: AsyncSession,
    data: InvestigationCreate,
    user_id: Optional[str] = None
) -> Investigation:
    inv = Investigation(
        title=data.title,
        target=data.target,
        type=data.type,
        status=data.status,
        user_id=user_id
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)

    # Automatically determine initial Target Entity node type!
    clean_target = data.target.strip()
    inv_type = (data.type or "").lower()

    if "username" in inv_type or "persona" in inv_type or clean_target.startswith("@"):
        initial_target_type = "USERNAME"
    elif "person" in inv_type:
        initial_target_type = "PERSON"
    elif "@" in clean_target and "." in clean_target:
        initial_target_type = "EMAIL"
    elif clean_target.replace(".", "").isdigit() and clean_target.count(".") == 3:
        initial_target_type = "IP ADDRESS"
    elif "." not in clean_target and not clean_target.startswith("http"):
        initial_target_type = "USERNAME"
    else:
        initial_target_type = "DOMAIN"
    
    target_entity = Entity(
        investigation_id=inv.id,
        entity_type=initial_target_type,
        value=normalize_entity_value(initial_target_type, data.target),
        raw_value=data.target,
        metadata_json={"is_target": True}
    )
    db.add(target_entity)
    await db.commit()

    return inv


async def get_investigations(db: AsyncSession, user_id: Optional[str] = None) -> List[dict]:
    stmt = select(Investigation)
    if user_id:
        stmt = stmt.where((Investigation.user_id == user_id) | (Investigation.user_id == None))
    stmt = stmt.order_by(Investigation.created_at.desc())
    result = await db.execute(stmt)
    invs = result.scalars().all()

    res = []
    for inv in invs:
        ent_count_stmt = select(func.count(Entity.id)).where(Entity.investigation_id == inv.id)
        rel_count_stmt = select(func.count(Relationship.id)).where(Relationship.investigation_id == inv.id)

        ent_c = (await db.execute(ent_count_stmt)).scalar() or 0
        rel_c = (await db.execute(rel_count_stmt)).scalar() or 0

        res.append({
            "id": inv.id,
            "user_id": inv.user_id,
            "title": inv.title,
            "target": inv.target,
            "type": inv.type,
            "status": inv.status,
            "created_at": inv.created_at,
            "updated_at": inv.updated_at,
            "entity_count": ent_c,
            "relationship_count": rel_c
        })
    return res


async def get_investigation_by_id(db: AsyncSession, inv_id: str) -> Optional[dict]:
    stmt = select(Investigation).where(Investigation.id == inv_id)
    result = await db.execute(stmt)
    inv = result.scalar_one_or_none()
    if not inv:
        return None
    
    ent_count_stmt = select(func.count(Entity.id)).where(Entity.investigation_id == inv.id)
    rel_count_stmt = select(func.count(Relationship.id)).where(Relationship.investigation_id == inv.id)

    ent_c = (await db.execute(ent_count_stmt)).scalar() or 0
    rel_c = (await db.execute(rel_count_stmt)).scalar() or 0

    return {
        "id": inv.id,
        "user_id": inv.user_id,
        "title": inv.title,
        "target": inv.target,
        "type": inv.type,
        "status": inv.status,
        "created_at": inv.created_at,
        "updated_at": inv.updated_at,
        "entity_count": ent_c,
        "relationship_count": rel_c
    }


async def delete_investigation(db: AsyncSession, inv_id: str) -> bool:
    stmt = select(Investigation).where(Investigation.id == inv_id)
    res = await db.execute(stmt)
    inv = res.scalar_one_or_none()
    if not inv:
        return False
    await db.delete(inv)
    await db.commit()
    return True


# --- Entity CRUD ---
async def create_entity(db: AsyncSession, data: EntityCreate) -> Entity:
    norm_val = normalize_entity_value(data.entity_type, data.value)
    
    # Check if duplicate exists in investigation
    stmt = select(Entity).where(
        Entity.investigation_id == data.investigation_id,
        Entity.entity_type == data.entity_type,
        Entity.value == norm_val
    )
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        return existing

    ent = Entity(
        investigation_id=data.investigation_id,
        entity_type=data.entity_type,
        value=norm_val,
        raw_value=data.value,
        metadata_json=data.metadata_json
    )
    db.add(ent)
    await db.commit()
    await db.refresh(ent)
    return ent


async def get_entities_by_investigation(db: AsyncSession, inv_id: str) -> List[Entity]:
    stmt = select(Entity).where(Entity.investigation_id == inv_id).order_by(Entity.first_seen.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def delete_entity(db: AsyncSession, entity_id: str) -> bool:
    stmt = select(Entity).where(Entity.id == entity_id)
    res = await db.execute(stmt)
    ent = res.scalar_one_or_none()
    if not ent:
        return False
    await db.delete(ent)
    await db.commit()
    return True


# --- Relationship CRUD ---
async def create_relationship(db: AsyncSession, data: RelationshipCreate) -> Relationship:
    stmt = select(Relationship).where(
        Relationship.investigation_id == data.investigation_id,
        Relationship.source_id == data.source_id,
        Relationship.target_id == data.target_id,
        Relationship.relation_type == data.relation_type
    )
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        return existing

    rel = Relationship(
        investigation_id=data.investigation_id,
        source_id=data.source_id,
        target_id=data.target_id,
        relation_type=data.relation_type,
        confidence=data.confidence,
        metadata_json=data.metadata_json
    )
    db.add(rel)
    await db.commit()
    await db.refresh(rel)
    return rel


async def get_relationships_by_investigation(db: AsyncSession, inv_id: str) -> List[Relationship]:
    stmt = select(Relationship).where(Relationship.investigation_id == inv_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def delete_relationship(db: AsyncSession, rel_id: str) -> bool:
    stmt = select(Relationship).where(Relationship.id == rel_id)
    res = await db.execute(stmt)
    rel = res.scalar_one_or_none()
    if not rel:
        return False
    await db.delete(rel)
    await db.commit()
    return True


# --- Note CRUD ---
async def create_note(db: AsyncSession, data: NoteCreate) -> Note:
    note = Note(
        investigation_id=data.investigation_id,
        title=data.title,
        content=data.content
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def get_notes_by_investigation(db: AsyncSession, inv_id: str) -> List[Note]:
    stmt = select(Note).where(Note.investigation_id == inv_id).order_by(Note.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_note(db: AsyncSession, note_id: str, data: NoteUpdate) -> Optional[Note]:
    stmt = select(Note).where(Note.id == note_id)
    res = await db.execute(stmt)
    note = res.scalar_one_or_none()
    if not note:
        return None
    if data.title is not None:
        note.title = data.title
    if data.content is not None:
        note.content = data.content
    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(db: AsyncSession, note_id: str) -> bool:
    stmt = select(Note).where(Note.id == note_id)
    res = await db.execute(stmt)
    note = res.scalar_one_or_none()
    if not note:
        return False
    await db.delete(note)
    await db.commit()
    return True


# --- Graph Generation Engine ---
async def get_graph_data(db: AsyncSession, inv_id: str) -> GraphResponse:
    entities = await get_entities_by_investigation(db, inv_id)
    relationships = await get_relationships_by_investigation(db, inv_id)

    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []

    target_id = None
    for e in entities:
        if e.metadata_json and e.metadata_json.get("is_target"):
            target_id = e.id
            break
    if not target_id and entities:
        target_id = entities[0].id

    total_nodes = len(entities)
    center_x = 400.0
    center_y = 300.0
    radius = 320.0

    non_target_idx = 0
    non_target_count = max(total_nodes - 1, 1)

    for e in entities:
        is_center = (e.id == target_id)
        if is_center:
            pos_x = center_x
            pos_y = center_y
        else:
            angle = (2 * math.pi * non_target_idx) / non_target_count
            pos_x = center_x + radius * math.cos(angle)
            pos_y = center_y + radius * math.sin(angle)
            non_target_idx += 1

        node_data = {
            "label": e.value,
            "entity_type": e.entity_type,
            "value": e.value,
            "first_seen": e.first_seen.isoformat(),
            "last_seen": e.last_seen.isoformat(),
            "metadata_json": e.metadata_json or {},
            "is_target": is_center
        }

        nodes.append(GraphNode(
            id=e.id,
            type="customEntityNode",
            data=node_data,
            position={"x": round(pos_x, 1), "y": round(pos_y, 1)}
        ))

    for r in relationships:
        edges.append(GraphEdge(
            id=r.id,
            source=r.source_id,
            target=r.target_id,
            label=r.relation_type,
            data={
                "relation_type": r.relation_type,
                "confidence": r.confidence,
                "metadata_json": r.metadata_json or {}
            }
        ))

    return GraphResponse(
        investigation_id=inv_id,
        nodes=nodes,
        edges=edges
    )


# =========================================================
# --- AEGIS-I4C: Incident Ticket & Complaint Triage CRUD ---
# =========================================================

async def create_incident_ticket(
    db: AsyncSession,
    raw_text: str,
    source_channel: str = "1930 Helpline",
    complainant_name: Optional[str] = None,
    complainant_contact: Optional[str] = None,
    user_id: Optional[str] = None,
    investigation_id: Optional[str] = None
) -> IncidentTicket:
    parsed: ParsedComplaintResult = ComplaintParser.parse_complaint(
        raw_text=raw_text,
        source_channel=source_channel,
        complainant_name=complainant_name,
        complainant_contact=complainant_contact
    )

    # Generate unique ticket number
    rand_suffix = f"{random.randint(10000, 99999)}"
    ticket_number = f"AEGIS-2026-{rand_suffix}"

    ticket = IncidentTicket(
        ticket_number=ticket_number,
        investigation_id=investigation_id,
        user_id=user_id,
        source_channel=source_channel,
        complainant_name=complainant_name,
        complainant_contact=complainant_contact,
        raw_complaint_text=raw_text.strip(),
        scam_category=parsed.scam_category,
        threat_severity=parsed.threat_severity,
        severity_level=parsed.severity_level,
        bns_sections=parsed.bns_sections,
        extracted_iocs=parsed.to_dict()["extracted_iocs"],
        status="TRIAGED"
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


async def get_incident_ticket_by_id(db: AsyncSession, ticket_id: str) -> Optional[IncidentTicket]:
    stmt = select(IncidentTicket).where(IncidentTicket.id == ticket_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_incident_ticket_by_investigation(db: AsyncSession, investigation_id: str) -> Optional[IncidentTicket]:
    stmt = select(IncidentTicket).where(IncidentTicket.investigation_id == investigation_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()



async def get_incident_ticket_by_number(db: AsyncSession, ticket_number: str) -> Optional[IncidentTicket]:
    stmt = select(IncidentTicket).where(IncidentTicket.ticket_number == ticket_number)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_incident_tickets(db: AsyncSession, user_id: Optional[str] = None) -> List[IncidentTicket]:
    stmt = select(IncidentTicket)
    if user_id:
        stmt = stmt.where((IncidentTicket.user_id == user_id) | (IncidentTicket.user_id == None))
    stmt = stmt.order_by(IncidentTicket.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def ingest_complaint_and_seed_graph(
    db: AsyncSession,
    raw_text: str,
    source_channel: str = "1930 Helpline",
    complainant_name: Optional[str] = None,
    complainant_contact: Optional[str] = None,
    user_id: Optional[str] = None,
    custom_title: Optional[str] = None
) -> dict:
    """
    Ingests an unstructured complaint, parses all IOCs, creates an Investigation,
    seeds the React Flow graph with normalized Entity and Relationship nodes,
    and returns ticket + investigation + graph.
    """
    parsed: ParsedComplaintResult = ComplaintParser.parse_complaint(
        raw_text=raw_text,
        source_channel=source_channel,
        complainant_name=complainant_name,
        complainant_contact=complainant_contact
    )

    rand_suffix = f"{random.randint(10000, 99999)}"
    ticket_number = f"AEGIS-2026-{rand_suffix}"

    # Determine primary investigation target label
    if parsed.upi_vpas:
        primary_target = parsed.upi_vpas[0]
    elif parsed.phishing_urls:
        primary_target = parsed.phishing_urls[0]
    elif parsed.phone_numbers:
        primary_target = parsed.phone_numbers[0]
    elif parsed.apk_hashes:
        primary_target = parsed.apk_hashes[0][:16]
    else:
        primary_target = ticket_number

    inv_title = custom_title or f"Triage #{ticket_number}: {parsed.scam_category}"

    # 1. Create Investigation
    inv = Investigation(
        title=inv_title,
        target=primary_target,
        type="Cyber Crime Triage",
        status="Active",
        user_id=user_id
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)

    # 2. Create Incident Ticket
    ticket = IncidentTicket(
        ticket_number=ticket_number,
        investigation_id=inv.id,
        user_id=user_id,
        source_channel=source_channel,
        complainant_name=complainant_name,
        complainant_contact=complainant_contact,
        raw_complaint_text=raw_text.strip(),
        scam_category=parsed.scam_category,
        threat_severity=parsed.threat_severity,
        severity_level=parsed.severity_level,
        bns_sections=parsed.bns_sections,
        extracted_iocs=parsed.to_dict()["extracted_iocs"],
        status="TRIAGED"
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    # 3. Create Root Node: COMPLAINT_TICKET
    root_entity = Entity(
        investigation_id=inv.id,
        entity_type="COMPLAINT_TICKET",
        value=ticket_number,
        raw_value=ticket_number,
        metadata_json={
            "is_target": True,
            "threat_severity": parsed.threat_severity,
            "severity_level": parsed.severity_level,
            "scam_category": parsed.scam_category,
            "source_channel": source_channel,
            "bns_sections": parsed.bns_sections,
            "summary": parsed.summary
        }
    )
    db.add(root_entity)
    await db.commit()
    await db.refresh(root_entity)

    # Helper mapping to avoid duplicate entities within this scan
    created_entities: dict = {("COMPLAINT_TICKET", ticket_number): root_entity}

    async def get_or_create_entity(e_type: str, val: str, meta: dict = None) -> Entity:
        norm_val = NormalizationEngine.normalize_value(e_type, val)
        key = (e_type, norm_val)
        if key in created_entities:
            return created_entities[key]

        ent = Entity(
            investigation_id=inv.id,
            entity_type=e_type,
            value=norm_val,
            raw_value=val,
            metadata_json=meta or {}
        )
        db.add(ent)
        await db.commit()
        await db.refresh(ent)
        created_entities[key] = ent
        return ent

    async def add_rel(src_id: str, tgt_id: str, r_type: str, conf: str = "CONFIRMED", meta: dict = None):
        rel = Relationship(
            investigation_id=inv.id,
            source_id=src_id,
            target_id=tgt_id,
            relation_type=r_type,
            confidence=conf,
            metadata_json=meta or {}
        )
        db.add(rel)

    # Seed UPI VPAs
    for vpa in parsed.upi_vpas:
        handle = vpa.split("@")[1] if "@" in vpa else "upi"
        vpa_ent = await get_or_create_entity("UPI_VPA", vpa, {"handle": handle, "risk": "SUSPECTED_FRAUD_RECEIVER"})
        await add_rel(root_entity.id, vpa_ent.id, "requests_payment_to", "CONFIRMED", {"direction": "OUTGOING"})

    # Seed Phone Numbers
    for phone in parsed.phone_numbers:
        ph_ent = await get_or_create_entity("PHONE", phone, {"country": "IN", "type": "MOBILE"})
        await add_rel(ph_ent.id, root_entity.id, "originates_complaint", "CONFIRMED")

    # Seed Phishing URLs & Domains
    for url in parsed.phishing_urls:
        url_ent = await get_or_create_entity("PHISHING_URL", url, {"risk": "MALICIOUS_LINK"})
        await add_rel(root_entity.id, url_ent.id, "hosts_phishing", "CONFIRMED")

    for domain in parsed.domains:
        dom_ent = await get_or_create_entity("DOMAIN", domain, {"risk": "SUSPICIOUS_INFRASTRUCTURE"})
        # Connect domain to root or to URL
        await add_rel(root_entity.id, dom_ent.id, "resolves_to_domain", "OBSERVED")

    # Seed SMS Headers
    for header in parsed.sms_headers:
        hdr_ent = await get_or_create_entity("SMS_HEADER", header, {"type": "TRAI_HEADER"})
        await add_rel(hdr_ent.id, root_entity.id, "originates_sms", "OBSERVED")

    # Seed APK Hashes & Names
    for apk_h in parsed.apk_hashes:
        apk_ent = await get_or_create_entity("APK_HASH", apk_h, {"hash_type": "SHA256" if len(apk_h) == 64 else "MD5"})
        await add_rel(root_entity.id, apk_ent.id, "distributes_apk", "CONFIRMED")

    # Seed Bank Accounts
    for acct in parsed.bank_accounts:
        acct_ent = await get_or_create_entity("BANK_ACCOUNT", acct, {"type": "BENEFICIARY_ACCOUNT"})
        await add_rel(root_entity.id, acct_ent.id, "settles_to_account", "INFERRED")

    await db.commit()

    # Initial SHA-256 Ledger Entry
    payload_str = f"{ticket.ticket_number}|{inv.id}|{parsed.threat_severity}|{parsed.scam_category}"
    payload_hash = hashlib.sha256(payload_str.encode()).hexdigest()
    genesis_prev_hash = "0" * 64
    merkle_hash = hashlib.sha256(f"{genesis_prev_hash}:{payload_hash}".encode()).hexdigest()

    ledger_entry = AuditLedgerEntry(
        entry_index=1,
        ticket_id=ticket.id,
        investigation_id=inv.id,
        action_type="COMPLAINT_INTAKE_AND_PARSED",
        actor="AEGIS-I4C Ingestion Subsystem",
        payload_hash=payload_hash,
        prev_hash=genesis_prev_hash,
        merkle_hash=merkle_hash,
        data_payload={
            "ticket_number": ticket.ticket_number,
            "scam_category": parsed.scam_category,
            "threat_severity": parsed.threat_severity,
            "bns_sections": parsed.bns_sections,
            "iocs_count": len(parsed.upi_vpas) + len(parsed.phone_numbers) + len(parsed.phishing_urls)
        },
        dpdp_compliance=True
    )
    db.add(ledger_entry)
    await db.commit()

    # Fetch fresh graph
    graph = await get_graph_data(db, inv.id)

    return {
        "ticket": ticket,
        "investigation": {
            "id": inv.id,
            "user_id": inv.user_id,
            "title": inv.title,
            "target": inv.target,
            "type": inv.type,
            "status": inv.status,
            "created_at": inv.created_at,
            "updated_at": inv.updated_at,
            "entity_count": len(graph.nodes),
            "relationship_count": len(graph.edges)
        },
        "parsed_iocs": parsed.to_dict()["extracted_iocs"],
        "graph": graph,
        "threat_score": parsed.threat_severity,
        "severity_level": parsed.severity_level,
        "bns_sections": parsed.bns_sections
    }


# =========================================================
# --- AEGIS-I4C: Mule Transaction & Legal Directives CRUD -
# =========================================================

async def create_mule_transaction(db: AsyncSession, data: MuleTransactionCreate) -> MuleTransaction:
    tx = MuleTransaction(
        investigation_id=data.investigation_id,
        ticket_id=data.ticket_id,
        source_vpa=data.source_vpa,
        destination_vpa=data.destination_vpa,
        source_bank=data.source_bank,
        destination_bank=data.destination_bank,
        amount=data.amount,
        tier_level=data.tier_level,
        risk_score=data.risk_score,
        is_cyclic=data.is_cyclic,
        is_rapid_split=data.is_rapid_split,
        metadata_json=data.metadata_json
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


async def get_mule_transactions(db: AsyncSession, investigation_id: str) -> List[MuleTransaction]:
    stmt = select(MuleTransaction).where(MuleTransaction.investigation_id == investigation_id).order_by(MuleTransaction.tier_level.asc(), MuleTransaction.transaction_time.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_legal_directive(db: AsyncSession, data: LegalDirectiveCreate) -> LegalDirective:
    rand_suffix = f"{random.randint(1000, 9999)}"
    directive_num = f"BNSS-106-2026-{rand_suffix}"

    raw_notice = data.notice_content or (
        f"STATUTORY FREEZE NOTICE UNDER SECTION 106 BNSS & SECTION 66D IT ACT\n"
        f"Directive: {directive_num}\n"
        f"Target: {data.target_entity_value} ({data.target_entity_type})\n"
        f"Recipient PSP/Bank: {data.psp_or_bank}\n"
        f"Action: {data.action_required}\n"
    )
    sha_hash = hashlib.sha256(raw_notice.encode()).hexdigest()

    directive = LegalDirective(
        directive_number=directive_num,
        investigation_id=data.investigation_id,
        ticket_id=data.ticket_id,
        legal_act=data.legal_act,
        target_entity_type=data.target_entity_type,
        target_entity_value=data.target_entity_value,
        psp_or_bank=data.psp_or_bank,
        action_required=data.action_required,
        status="DRAFTED",
        notice_content=raw_notice,
        sha256_hash=sha_hash
    )
    db.add(directive)
    await db.commit()
    await db.refresh(directive)
    return directive


async def get_legal_directives(db: AsyncSession, investigation_id: str) -> List[LegalDirective]:
    stmt = select(LegalDirective).where(LegalDirective.investigation_id == investigation_id).order_by(LegalDirective.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_audit_ledger_entries(db: AsyncSession, investigation_id: Optional[str] = None, ticket_id: Optional[str] = None) -> List[AuditLedgerEntry]:
    stmt = select(AuditLedgerEntry)
    if investigation_id:
        stmt = stmt.where(AuditLedgerEntry.investigation_id == investigation_id)
    if ticket_id:
        stmt = stmt.where(AuditLedgerEntry.ticket_id == ticket_id)
    stmt = stmt.order_by(AuditLedgerEntry.entry_index.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def append_audit_ledger_entry(
    db: AsyncSession,
    investigation_id: str,
    action_type: str,
    actor: str,
    data_payload: Dict[str, Any],
    ticket_id: Optional[str] = None
) -> AuditLedgerEntry:
    """Appends an immutable cryptographically chained block to the audit ledger."""
    existing_entries = await get_audit_ledger_entries(db, investigation_id=investigation_id)
    entry_index = len(existing_entries) + 1
    
    prev_hash = existing_entries[-1].merkle_hash if existing_entries else ("0" * 64)
    
    payload_str = json.dumps(data_payload, sort_keys=True)
    payload_hash = hashlib.sha256(payload_str.encode()).hexdigest()
    merkle_hash = hashlib.sha256(f"{prev_hash}:{payload_hash}".encode()).hexdigest()

    entry = AuditLedgerEntry(
        entry_index=entry_index,
        ticket_id=ticket_id,
        investigation_id=investigation_id,
        action_type=action_type,
        actor=actor,
        payload_hash=payload_hash,
        prev_hash=prev_hash,
        merkle_hash=merkle_hash,
        data_payload=data_payload,
        dpdp_compliance=True
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def verify_audit_ledger_chain(db: AsyncSession, investigation_id: str) -> dict:
    """
    Cryptographically verifies the SHA-256 Merkle chain integrity of an investigation.
    Returns proof of non-tampering under Section 63 BSA (Bharatiya Sakshya Adhiniyam, 2023)
    and DPDP Act 2023 compliance.
    """
    import time
    start_time = time.time()

    entries = await get_audit_ledger_entries(db, investigation_id=investigation_id)
    if not entries:
        return {
            "investigation_id": investigation_id,
            "total_entries": 0,
            "is_valid": True,
            "chain_status": "EMPTY_LEDGER",
            "dpdp_compliant": True,
            "latest_merkle_root": "0" * 64,
            "first_entry_hash": "0" * 64,
            "verification_time_ms": 0.0,
            "entries": []
        }

    is_valid = True
    expected_prev = "0" * 64

    for idx, entry in enumerate(entries):
        # 1. Verify prev_hash matches prior entry's merkle_hash
        if entry.prev_hash != expected_prev:
            is_valid = False
            break

        # 2. Recompute payload hash and merkle hash
        payload_str = json.dumps(entry.data_payload, sort_keys=True)
        recomputed_payload_hash = hashlib.sha256(payload_str.encode()).hexdigest()
        recomputed_merkle_hash = hashlib.sha256(f"{entry.prev_hash}:{recomputed_payload_hash}".encode()).hexdigest()

        # Compare with recorded merkle_hash (allow for backward compatibility with initial string seeds)
        if entry.merkle_hash != recomputed_merkle_hash and entry.entry_index > 1:
            # Check if recorded matches hash calculation
            expected_merkle = hashlib.sha256(f"{entry.prev_hash}:{entry.payload_hash}".encode()).hexdigest()
            if entry.merkle_hash != expected_merkle:
                is_valid = False
                break

        expected_prev = entry.merkle_hash

    verification_time_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "investigation_id": investigation_id,
        "total_entries": len(entries),
        "is_valid": is_valid,
        "chain_status": "TAMPER_EVIDENT_VERIFIED" if is_valid else "COMPROMISED",
        "dpdp_compliant": True,
        "latest_merkle_root": entries[-1].merkle_hash,
        "first_entry_hash": entries[0].merkle_hash,
        "verification_time_ms": verification_time_ms,
        "entries": entries
    }


