from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- User Authentication Schemas ---
class UserRegisterRequest(BaseModel):
    email: str = Field(..., example="analyst@tracex.osint")
    password: str = Field(..., min_length=6, example="SecurePassword123!")
    display_name: Optional[str] = Field(default="Recon Analyst", example="John Doe")
    role: Optional[str] = Field(default="Lead Investigator", example="Lead Investigator")

class UserLoginRequest(BaseModel):
    email: str = Field(..., example="analyst@tracex.osint")
    password: str = Field(..., example="SecurePassword123!")

class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class UserProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None


# --- Investigation Schemas ---
class InvestigationBase(BaseModel):
    title: str = Field(..., example="Example Corp Target")
    target: str = Field(..., example="example.com")
    type: str = Field(default="Domain Investigation", example="Domain Investigation")
    status: str = Field(default="Active", example="Active")

class InvestigationCreate(InvestigationBase):
    pass

class InvestigationResponse(InvestigationBase):
    id: str
    user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    entity_count: int = 0
    relationship_count: int = 0

    class Config:
        from_attributes = True


# --- Entity Schemas ---
class EntityBase(BaseModel):
    entity_type: str = Field(..., example="DOMAIN")  # DOMAIN, IP ADDRESS, EMAIL, PERSON, ORGANIZATION, USERNAME, REPOSITORY, URL, CERTIFICATE, ASN
    value: str = Field(..., example="example.com")
    metadata_json: Dict[str, Any] = Field(default_factory=dict)

class EntityCreate(EntityBase):
    investigation_id: str

class EntityResponse(EntityBase):
    id: str
    investigation_id: str
    raw_value: str
    first_seen: datetime
    last_seen: datetime

    class Config:
        from_attributes = True


# --- Relationship Schemas ---
class RelationshipBase(BaseModel):
    source_id: str
    target_id: str
    relation_type: str = Field(..., example="resolves_to")  # owns, resolves_to, contributed_to, subdomain_of, etc.
    confidence: str = Field(default="OBSERVED", example="CONFIRMED")  # CONFIRMED, OBSERVED, INFERRED, POSSIBLE, UNKNOWN
    metadata_json: Dict[str, Any] = Field(default_factory=dict)

class RelationshipCreate(RelationshipBase):
    investigation_id: str

class RelationshipResponse(RelationshipBase):
    id: str
    investigation_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Evidence Schemas ---
class EvidenceBase(BaseModel):
    source_name: str
    raw_record: str
    confidence: str = "OBSERVED"

class EvidenceResponse(EvidenceBase):
    id: str
    entity_id: Optional[str]
    relationship_id: Optional[str]
    observed_at: datetime

    class Config:
        from_attributes = True


# --- Note Schemas ---
class NoteCreate(BaseModel):
    investigation_id: str
    title: str = "Untitled Note"
    content: str

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class NoteResponse(BaseModel):
    id: str
    investigation_id: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Graph Schemas ---
class GraphNode(BaseModel):
    id: str
    type: str = "customEntityNode"
    data: Dict[str, Any]
    position: Dict[str, float]

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    data: Dict[str, Any]

class GraphResponse(BaseModel):
    investigation_id: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]


# --- Phase 3: Snapshot Schemas ---
class SnapshotCreate(BaseModel):
    title: str = Field(..., example="Snapshot #1 - Pre-scan Baseline")
    notes: Optional[str] = Field(default=None, example="Initial reconnaissance snapshot")

class SnapshotResponse(BaseModel):
    id: str
    investigation_id: str
    version: int
    title: str
    notes: Optional[str] = None
    entities_count: int
    relationships_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class DiffEntityItem(BaseModel):
    entity_type: str
    value: str
    change_type: str  # 'ADDED', 'REMOVED', 'CHANGED'
    details: Optional[str] = None

class DiffRelationshipItem(BaseModel):
    source_value: str
    target_value: str
    relation_type: str
    change_type: str  # 'ADDED', 'REMOVED'

class SnapshotDiffResponse(BaseModel):
    snapshot_a_id: str
    snapshot_a_title: str
    snapshot_a_date: datetime
    snapshot_b_id: str
    snapshot_b_title: str
    snapshot_b_date: datetime
    added_entities: List[DiffEntityItem] = Field(default_factory=list)
    removed_entities: List[DiffEntityItem] = Field(default_factory=list)
    changed_entities: List[DiffEntityItem] = Field(default_factory=list)
    added_relationships: List[DiffRelationshipItem] = Field(default_factory=list)
    removed_relationships: List[DiffRelationshipItem] = Field(default_factory=list)
    summary: Dict[str, int]


# --- Phase 3: Timeline Schemas ---
class TimelineEventResponse(BaseModel):
    id: str
    timestamp: datetime
    event_type: str  # 'DISCOVERY', 'UPDATE', 'NOTE', 'SCAN', 'CERTIFICATE', 'DNS'
    title: str
    description: str
    entity_type: Optional[str] = None
    entity_value: Optional[str] = None
    source: str
    confidence: str = "OBSERVED"


# =======================================================
# --- AEGIS-I4C: Complaint Parsing & Incident Schemas ---
# =======================================================

class ExtractedIOCs(BaseModel):
    upi_vpas: List[str] = Field(default_factory=list)
    phone_numbers: List[str] = Field(default_factory=list)
    phishing_urls: List[str] = Field(default_factory=list)
    domains: List[str] = Field(default_factory=list)
    sms_headers: List[str] = Field(default_factory=list)
    apk_hashes: List[str] = Field(default_factory=list)
    apk_names: List[str] = Field(default_factory=list)
    bank_accounts: List[str] = Field(default_factory=list)
    ifsc_codes: List[str] = Field(default_factory=list)
    monetary_amounts: List[str] = Field(default_factory=list)
    threat_keywords: List[str] = Field(default_factory=list)


class ComplaintParseRequest(BaseModel):
    raw_text: str = Field(..., min_length=5, example="Dear user your electricity will be disconnected tonight. Pay Rs 15 to UPI scammer@paytm or call 9876543210")
    source_channel: Optional[str] = Field(default="1930 Helpline", example="1930 Helpline")
    complainant_name: Optional[str] = Field(default=None, example="Aarav Sharma")
    complainant_contact: Optional[str] = Field(default=None, example="+91 9811122233")


class ComplaintParseResponse(BaseModel):
    raw_text: str
    source_channel: str
    scam_category: str
    threat_severity: int  # 0 to 100
    severity_level: str   # LOW, MEDIUM, HIGH, CRITICAL
    bns_sections: List[str]
    extracted_iocs: ExtractedIOCs
    summary: str


class IncidentTicketResponse(BaseModel):
    id: str
    ticket_number: str
    investigation_id: Optional[str] = None
    source_channel: str
    complainant_name: Optional[str] = None
    complainant_contact: Optional[str] = None
    raw_complaint_text: str
    scam_category: str
    threat_severity: int
    severity_level: str
    bns_sections: List[str]
    extracted_iocs: Dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComplaintIngestRequest(BaseModel):
    raw_text: str = Field(..., min_length=5)
    source_channel: Optional[str] = "1930 Helpline"
    complainant_name: Optional[str] = None
    complainant_contact: Optional[str] = None
    auto_create_investigation: bool = True
    investigation_title: Optional[str] = None


class ComplaintIngestResponse(BaseModel):
    ticket: IncidentTicketResponse
    investigation: InvestigationResponse
    parsed_iocs: ExtractedIOCs
    graph: GraphResponse
    threat_score: int
    severity_level: str
    bns_sections: List[str]


class MuleTransactionCreate(BaseModel):
    investigation_id: str
    ticket_id: Optional[str] = None
    source_vpa: str
    destination_vpa: str
    source_bank: Optional[str] = None
    destination_bank: Optional[str] = None
    amount: int = 0
    tier_level: int = 1
    risk_score: int = 50
    is_cyclic: bool = False
    is_rapid_split: bool = False
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class MuleTransactionResponse(BaseModel):
    id: str
    investigation_id: str
    ticket_id: Optional[str]
    source_vpa: str
    destination_vpa: str
    source_bank: Optional[str]
    destination_bank: Optional[str]
    amount: int
    tier_level: int
    risk_score: int
    is_cyclic: bool
    is_rapid_split: bool
    metadata_json: Dict[str, Any]
    transaction_time: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class LegalDirectiveCreate(BaseModel):
    investigation_id: str
    ticket_id: Optional[str] = None
    legal_act: str = "Section 94 BNSS / Section 66D IT Act"
    target_entity_type: str
    target_entity_value: str
    psp_or_bank: str
    action_required: str = "IMMEDIATE_DEBIT_FREEZE"
    notice_content: Optional[str] = None


class LegalDirectiveResponse(BaseModel):
    id: str
    directive_number: str
    investigation_id: str
    ticket_id: Optional[str]
    legal_act: str
    target_entity_type: str
    target_entity_value: str
    psp_or_bank: str
    action_required: str
    status: str
    notice_content: Optional[str]
    pdf_path: Optional[str]
    sha256_hash: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLedgerEntryResponse(BaseModel):
    id: str
    entry_index: int
    ticket_id: Optional[str]
    investigation_id: Optional[str]
    action_type: str
    actor: str
    payload_hash: str
    prev_hash: str
    merkle_hash: str
    data_payload: Dict[str, Any]
    dpdp_compliance: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SampleComplaintItem(BaseModel):
    id: str
    title: str
    source_channel: str
    category: str
    payload: str


# --- Phase 2: OSINT Sentinel & Mule Tracer Schemas ---

class OSINTInspectRequest(BaseModel):
    target: str = Field(..., example="sbi-rewards-yono.xyz")
    investigation_id: Optional[str] = None


class OSINTInspectResponse(BaseModel):
    target: str
    target_type: str
    risk_score: int
    risk_level: str
    risk_flags: List[str]
    domain_age: Dict[str, Any]
    dns_records: Dict[str, Any]
    email_security: Dict[str, Any]
    ssl_info: Dict[str, Any]
    ip_info: Dict[str, Any]
    execution_time_ms: float


class MuleTraceRequest(BaseModel):
    investigation_id: str
    seed_vpas: List[str] = Field(..., example=["bijli.officer@paytm"])
    ticket_id: Optional[str] = None


class MuleTraceResponse(BaseModel):
    investigation_id: str
    seed_vpas: List[str]
    tier_1_count: int
    tier_2_count: int
    tier_3_count: int
    total_transactions: int
    total_flow_amount: int
    anomalies: Dict[str, Any]
    nodes: List[Dict[str, Any]]
    transactions: List[Dict[str, Any]]


class MuleIntelCheckResponse(BaseModel):
    matched: bool
    confidence: str
    details: Dict[str, Any]


class LedgerVerificationResponse(BaseModel):
    investigation_id: str
    total_entries: int
    is_valid: bool
    chain_status: str
    dpdp_compliant: bool
    latest_merkle_root: str
    first_entry_hash: str
    verification_time_ms: float
    entries: List[AuditLedgerEntryResponse]


class BankStatementIngestRequest(BaseModel):
    investigation_id: str
    csv_content: str
    source_account: Optional[str] = None


class BankStatementIngestResponse(BaseModel):
    custody_envelope: Dict[str, Any]
    analysis: Dict[str, Any]


# --- Phase 3 & 4 Schemas ---
class ApkUploadResponse(BaseModel):
    success: bool
    filename: str
    package_name: str
    malware_family: str
    threat_risk_score: int
    threat_tags: List[str]
    dangerous_permissions: List[Dict[str, Any]]
    c2_urls: List[str]
    c2_ips: List[str]
    telegram_bots: List[str]
    telegram_chats: List[str]
    extracted_phones: List[str]
    custody_envelope: Dict[str, Any]
    graph_sync: Optional[Dict[str, Any]] = None


class CDNCleanResponse(BaseModel):
    success: bool
    message: str
    details: Dict[str, Any]


class VisionOCREquest(BaseModel):
    investigation_id: Optional[str] = None
    image_base64: str
    filename: Optional[str] = "evidence.jpg"
    evidence_type: Optional[str] = "COMPLAINT_FIR"


class VisionOCRResponse(BaseModel):
    success: bool
    complainant_name: Optional[str] = None
    complainant_phone: Optional[str] = None
    defrauded_amount_inr: Optional[int] = None
    suspect_upi_vpas: List[str] = []
    suspect_bank_accounts: List[str] = []
    suspect_ifsc_codes: List[str] = []
    suspect_phone_numbers: List[str] = []
    transaction_utrs: List[str] = []
    phishing_urls: List[str] = []
    scam_narrative: str
    scam_category: str
    confidence_score: int
    custody_envelope: Dict[str, Any]
    analysis_method: str
    filename: str
    evidence_type: str


class SyndicateProfileResponse(BaseModel):
    investigation_id: str
    matched_syndicate_id: str
    confidence_score: int
    syndicate_name: str
    epicenter: str
    primary_mo: str
    statutory_violations: List[str]
    matched_indicators: List[str]
    recommended_countermeasures: List[str]
    all_syndicate_rankings: List[Dict[str, Any]]




# --- Phase 5 Schemas: Inter-Agency Intel Exchange & Coordination ---
class IntelBroadcastRequest(BaseModel):
    investigation_id: str
    target_agencies: List[str]
    broadcaster_officer: Optional[str] = "Inspector AEGIS Cyber Command"
    custom_notes: Optional[str] = None


class IntelBroadcastResponse(BaseModel):
    success: bool
    broadcast_id: str
    investigation_id: str
    investigation_title: str
    target: str
    crime_category: str
    broadcaster_officer: str
    broadcast_timestamp: str
    total_iocs_broadcast: int
    iocs_breakdown: Dict[str, Any]
    agency_deliveries: List[Dict[str, Any]]
    action_required: str


class IntelFeedItem(BaseModel):
    feed_id: str
    timestamp: str
    origin_agency: str
    alert_title: str
    severity: str
    iocs: List[str]
    action: str
