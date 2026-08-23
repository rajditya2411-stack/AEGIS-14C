export type EntityType = 
  | 'DOMAIN'
  | 'IP ADDRESS'
  | 'EMAIL'
  | 'PERSON'
  | 'ORGANIZATION'
  | 'USERNAME'
  | 'REPOSITORY'
  | 'URL'
  | 'CERTIFICATE'
  | 'ASN'
  | 'TRACKING_ID'
  | 'PHONE'
  | 'UPI_VPA'
  | 'BANK_ACCOUNT'
  | 'APK_HASH'
  | 'SMS_HEADER'
  | 'PHISHING_URL'
  | 'COMPLAINT_TICKET'
  | 'MULE_ACCOUNT'
  | 'LEGAL_DIRECTIVE';

export type ConfidenceLevel = 'CONFIRMED' | 'OBSERVED' | 'INFERRED' | 'POSSIBLE' | 'UNKNOWN';

export interface Investigation {
  id: string;
  title: string;
  target: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  entity_count: number;
  relationship_count: number;
}

export interface Entity {
  id: string;
  investigation_id: string;
  entity_type: EntityType;
  value: string;
  raw_value: string;
  metadata_json: Record<string, any>;
  first_seen: string;
  last_seen: string;
}

export interface Relationship {
  id: string;
  investigation_id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  confidence: ConfidenceLevel;
  metadata_json: Record<string, any>;
  created_at: string;
  source_value?: string;
  target_value?: string;
}

export interface Note {
  id: string;
  investigation_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface GraphNodeData {
  id: string;
  label: string;
  raw_value: string;
  entity_type: EntityType;
  metadata: Record<string, any>;
  first_seen: string;
  last_seen: string;
  is_target?: boolean;
}

// --- Phase 3: Snapshots & Timeline Types ---
export interface Snapshot {
  id: string;
  investigation_id: string;
  version: number;
  title: string;
  notes?: string;
  entities_count: number;
  relationships_count: number;
  created_at: string;
}

export interface DiffEntityItem {
  entity_type: EntityType;
  value: string;
  change_type: 'ADDED' | 'REMOVED' | 'CHANGED';
  details?: string;
}

export interface DiffRelationshipItem {
  source_value: string;
  target_value: string;
  relation_type: string;
  change_type: 'ADDED' | 'REMOVED';
}

export interface SnapshotDiffResponse {
  snapshot_a_id: string;
  snapshot_a_title: string;
  snapshot_a_date: string;
  snapshot_b_id: string;
  snapshot_b_title: string;
  snapshot_b_date: string;
  added_entities: DiffEntityItem[];
  removed_entities: DiffEntityItem[];
  changed_entities: DiffEntityItem[];
  added_relationships: DiffRelationshipItem[];
  removed_relationships: DiffRelationshipItem[];
  summary: {
    added_entities_count: number;
    removed_entities_count: number;
    changed_entities_count: number;
    added_relationships_count: number;
    removed_relationships_count: number;
  };
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  event_type: 'CASE_START' | 'DISCOVERY' | 'UPDATE' | 'NOTE' | 'SNAPSHOT' | 'CERTIFICATE' | 'DNS' | 'IP_SHIFT' | 'EVIDENCE';
  title: string;
  description: string;
  entity_type?: EntityType;
  entity_value?: string;
  source: string;
  confidence: ConfidenceLevel;
}

// --- User Authentication Types ---
export interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// --- AEGIS-I4C Triage Types ---
export interface ExtractedIOCs {
  upi_vpas: string[];
  phone_numbers: string[];
  phishing_urls: string[];
  domains: string[];
  sms_headers: string[];
  apk_hashes: string[];
  apk_names: string[];
  bank_accounts: string[];
  ifsc_codes: string[];
  monetary_amounts: string[];
  threat_keywords: string[];
}

export interface ComplaintParseResponse {
  raw_text: string;
  source_channel: string;
  scam_category: string;
  threat_severity: number;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  bns_sections: string[];
  it_act_sections: string[];
  all_legal_sections: string[];
  extracted_iocs: ExtractedIOCs;
  summary: string;
}

export interface IncidentTicket {
  id: string;
  ticket_number: string;
  investigation_id?: string;
  source_channel: string;
  complainant_name?: string;
  complainant_contact?: string;
  raw_complaint_text: string;
  scam_category: string;
  threat_severity: number;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  bns_sections: string[];
  extracted_iocs: ExtractedIOCs;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SampleComplaintItem {
  id: string;
  title: string;
  source_channel: string;
  category: string;
  payload: string;
}

export interface LegalDirective {
  id: string;
  directive_number: string;
  investigation_id: string;
  ticket_id?: string;
  legal_act: string;
  target_entity_type: string;
  target_entity_value: string;
  psp_or_bank: string;
  action_required: string;
  status: string;
  notice_content?: string;
  pdf_path?: string;
  sha256_hash?: string;
  created_at: string;
}

export interface AuditLedgerEntry {
  id: string;
  entry_index: number;
  ticket_id?: string;
  investigation_id?: string;
  action_type: string;
  actor: string;
  payload_hash: string;
  prev_hash: string;
  merkle_hash: string;
  data_payload: Record<string, any>;
  dpdp_compliance: boolean;
  created_at: string;
}

export interface LedgerVerificationResponse {
  investigation_id: string;
  total_entries: number;
  is_valid: boolean;
  chain_status: string;
  dpdp_compliant: boolean;
  latest_merkle_root: string;
  first_entry_hash: string;
  verification_time_ms: number;
  entries: AuditLedgerEntry[];
}

export interface MuleTransaction {
  id: string;
  investigation_id: string;
  ticket_id?: string;
  source_vpa: string;
  destination_vpa: string;
  source_bank: string;
  destination_bank: string;
  amount: number;
  tier_level: number;
  risk_score: number;
  is_cyclic: boolean;
  is_rapid_split: boolean;
  transaction_time: string;
  metadata_json?: Record<string, any>;
}



