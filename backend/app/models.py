import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, JSON, ForeignKey, Integer, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
import enum

from app.database import Base

class EntityType(str, enum.Enum):
    DOMAIN = "DOMAIN"
    IP_ADDRESS = "IP ADDRESS"
    EMAIL = "EMAIL"
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"
    USERNAME = "USERNAME"
    REPOSITORY = "REPOSITORY"
    URL = "URL"
    CERTIFICATE = "CERTIFICATE"
    ASN = "ASN"
    TRACKING_ID = "TRACKING_ID"
    PHONE = "PHONE"
    UPI_VPA = "UPI_VPA"
    BANK_ACCOUNT = "BANK_ACCOUNT"
    APK_HASH = "APK_HASH"
    SMS_HEADER = "SMS_HEADER"
    PHISHING_URL = "PHISHING_URL"
    COMPLAINT_TICKET = "COMPLAINT_TICKET"
    MULE_ACCOUNT = "MULE_ACCOUNT"
    LEGAL_DIRECTIVE = "LEGAL_DIRECTIVE"

class ConfidenceLevel(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    OBSERVED = "OBSERVED"
    INFERRED = "INFERRED"
    POSSIBLE = "POSSIBLE"
    UNKNOWN = "UNKNOWN"

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    salt: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), default="Recon Analyst")
    role: Mapped[str] = mapped_column(String(50), default="Lead Investigator")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    investigations: Mapped[List["Investigation"]] = relationship("Investigation", back_populates="user", cascade="all, delete-orphan")
    incident_tickets: Mapped[List["IncidentTicket"]] = relationship("IncidentTicket", back_populates="user", cascade="all, delete-orphan")


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    target: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), default="Cyber Crime Triage")
    status: Mapped[str] = mapped_column(String(50), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped[Optional["User"]] = relationship("User", back_populates="investigations")
    entities: Mapped[List["Entity"]] = relationship("Entity", back_populates="investigation", cascade="all, delete-orphan")
    relationships: Mapped[List["Relationship"]] = relationship("Relationship", back_populates="investigation", cascade="all, delete-orphan")
    notes: Mapped[List["Note"]] = relationship("Note", back_populates="investigation", cascade="all, delete-orphan")
    snapshots: Mapped[List["Snapshot"]] = relationship("Snapshot", back_populates="investigation", cascade="all, delete-orphan")
    incident_ticket: Mapped[Optional["IncidentTicket"]] = relationship("IncidentTicket", back_populates="investigation", uselist=False, cascade="all, delete-orphan")
    mule_transactions: Mapped[List["MuleTransaction"]] = relationship("MuleTransaction", back_populates="investigation", cascade="all, delete-orphan")
    legal_directives: Mapped[List["LegalDirective"]] = relationship("LegalDirective", back_populates="investigation", cascade="all, delete-orphan")
    ledger_entries: Mapped[List["AuditLedgerEntry"]] = relationship("AuditLedgerEntry", back_populates="investigation", cascade="all, delete-orphan")


class IncidentTicket(Base):
    __tablename__ = "incident_tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    investigation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    source_channel: Mapped[str] = mapped_column(String(50), default="1930 Helpline")
    complainant_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    complainant_contact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    raw_complaint_text: Mapped[str] = mapped_column(Text, nullable=False)
    scam_category: Mapped[str] = mapped_column(String(100), default="UPI Phishing / Financial Fraud")
    threat_severity: Mapped[int] = mapped_column(Integer, default=50)
    severity_level: Mapped[str] = mapped_column(String(50), default="MEDIUM")
    bns_sections: Mapped[list] = mapped_column(JSON, default=list)
    extracted_iocs: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(50), default="TRIAGED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    investigation: Mapped[Optional["Investigation"]] = relationship("Investigation", back_populates="incident_ticket")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="incident_tickets")
    transactions: Mapped[List["MuleTransaction"]] = relationship("MuleTransaction", back_populates="ticket", cascade="all, delete-orphan")
    legal_directives: Mapped[List["LegalDirective"]] = relationship("LegalDirective", back_populates="ticket", cascade="all, delete-orphan")
    ledger_entries: Mapped[List["AuditLedgerEntry"]] = relationship("AuditLedgerEntry", back_populates="ticket", cascade="all, delete-orphan")


class MuleTransaction(Base):
    __tablename__ = "mule_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    ticket_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("incident_tickets.id", ondelete="CASCADE"), nullable=True)
    source_vpa: Mapped[str] = mapped_column(String(255), nullable=False)
    destination_vpa: Mapped[str] = mapped_column(String(255), nullable=False)
    source_bank: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    destination_bank: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    amount: Mapped[int] = mapped_column(Integer, default=0)
    tier_level: Mapped[int] = mapped_column(Integer, default=1)
    risk_score: Mapped[int] = mapped_column(Integer, default=50)
    is_cyclic: Mapped[bool] = mapped_column(Boolean, default=False)
    is_rapid_split: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    transaction_time: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="mule_transactions")
    ticket: Mapped[Optional["IncidentTicket"]] = relationship("IncidentTicket", back_populates="transactions")


class LegalDirective(Base):
    __tablename__ = "legal_directives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    directive_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    ticket_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("incident_tickets.id", ondelete="CASCADE"), nullable=True)
    legal_act: Mapped[str] = mapped_column(String(100), default="Section 94 BNSS / Section 66D IT Act")
    target_entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_entity_value: Mapped[str] = mapped_column(String(255), nullable=False)
    psp_or_bank: Mapped[str] = mapped_column(String(100), nullable=False)
    action_required: Mapped[str] = mapped_column(String(100), default="IMMEDIATE_DEBIT_FREEZE")
    status: Mapped[str] = mapped_column(String(50), default="DRAFTED")
    notice_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sha256_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="legal_directives")
    ticket: Mapped[Optional["IncidentTicket"]] = relationship("IncidentTicket", back_populates="legal_directives")


class AuditLedgerEntry(Base):
    __tablename__ = "audit_ledger_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entry_index: Mapped[int] = mapped_column(Integer, nullable=False)
    ticket_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("incident_tickets.id", ondelete="SET NULL"), nullable=True)
    investigation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="SET NULL"), nullable=True)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    actor: Mapped[str] = mapped_column(String(100), default="AEGIS-I4C Multi-Agent Engine")
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    merkle_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    data_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    dpdp_compliance: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    investigation: Mapped[Optional["Investigation"]] = relationship("Investigation", back_populates="ledger_entries")
    ticket: Mapped[Optional["IncidentTicket"]] = relationship("IncidentTicket", back_populates="ledger_entries")


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    raw_value: Mapped[str] = mapped_column(String(500), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    first_seen: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="entities")
    outgoing_relationships: Mapped[List["Relationship"]] = relationship("Relationship", foreign_keys="Relationship.source_id", back_populates="source_entity", cascade="all, delete-orphan")
    incoming_relationships: Mapped[List["Relationship"]] = relationship("Relationship", foreign_keys="Relationship.target_id", back_populates="target_entity", cascade="all, delete-orphan")
    evidence: Mapped[List["Evidence"]] = relationship("Evidence", back_populates="entity", cascade="all, delete-orphan")


class Relationship(Base):
    __tablename__ = "relationships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[str] = mapped_column(String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    relation_type: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[str] = mapped_column(String(50), default="OBSERVED")
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="relationships")
    source_entity: Mapped["Entity"] = relationship("Entity", foreign_keys=[source_id], back_populates="outgoing_relationships")
    target_entity: Mapped["Entity"] = relationship("Entity", foreign_keys=[target_id], back_populates="incoming_relationships")
    evidence: Mapped[List["Evidence"]] = relationship("Evidence", back_populates="relationship", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=True)
    relationship_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("relationships.id", ondelete="CASCADE"), nullable=True)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    raw_record: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[str] = mapped_column(String(50), default="OBSERVED")
    observed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    entity: Mapped[Optional["Entity"]] = relationship("Entity", back_populates="evidence")
    relationship: Mapped[Optional["Relationship"]] = relationship("Relationship", back_populates="evidence")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="Untitled Note")
    content: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="notes")


class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    entities_count: Mapped[int] = mapped_column(Integer, default=0)
    relationships_count: Mapped[int] = mapped_column(Integer, default=0)
    graph_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="snapshots")
