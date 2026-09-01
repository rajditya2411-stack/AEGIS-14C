import type {
  Investigation,
  Entity,
  Relationship,
  Note,
  EntityType,
  ConfidenceLevel,
  Snapshot,
  SnapshotDiffResponse,
  TimelineEvent,
  User,
  AuthResponse,
  SampleComplaintItem,
  ComplaintParseResponse,
  IncidentTicket
} from '../types';

let rawBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api/v1';
if (rawBase && !rawBase.endsWith('/api/v1') && !rawBase.endsWith('/api/v1/')) {
  rawBase = rawBase.replace(/\/$/, '') + '/api/v1';
}
const API_BASE = rawBase;
const AUTH_TOKEN_KEY = 'tracex_auth_token';

// --- Auth Token Management ---
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// --- Authenticated Fetch Wrapper ---
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}


// --- Authentication APIs ---
export async function registerUser(data: {
  email: string;
  password: string;
  display_name?: string;
  role?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
  const result: AuthResponse = await res.json();
  setAuthToken(result.access_token);
  return result;
}

export async function loginUser(data: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
    throw new Error(err.detail || 'Invalid email or password');
  }
  const result: AuthResponse = await res.json();
  setAuthToken(result.access_token);
  return result;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await apiFetch(`${API_BASE}/auth/me`);
  if (!res.ok) {
    clearAuthToken();
    throw new Error('Unauthenticated or session expired');
  }
  return res.json();
}

export async function changePassword(current_password: string, new_password: string): Promise<User> {
  const res = await apiFetch(`${API_BASE}/auth/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password, new_password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update password' }));
    throw new Error(err.detail || 'Failed to update password');
  }
  return res.json();
}

export async function updateUserProfile(data: { display_name?: string; role?: string }): Promise<User> {
  const res = await apiFetch(`${API_BASE}/auth/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update profile' }));
    throw new Error(err.detail || 'Failed to update profile');
  }
  return res.json();
}

export function logoutUser(): void {
  clearAuthToken();
}


// --- Investigation APIs ---
export async function fetchInvestigations(): Promise<Investigation[]> {
  const res = await apiFetch(`${API_BASE}/investigations`);
  if (!res.ok) throw new Error('Failed to fetch investigations');
  return res.json();
}

export async function createInvestigation(data: { title: string; target: string; type?: string }): Promise<Investigation> {
  const res = await apiFetch(`${API_BASE}/investigations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create investigation');
  return res.json();
}

export async function deleteInvestigation(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/investigations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete investigation');
}


// --- Entity APIs ---
export async function fetchEntities(invId: string): Promise<Entity[]> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/entities`);
  if (!res.ok) throw new Error('Failed to fetch entities');
  return res.json();
}

export async function createEntity(investigationId: string, data: { entity_type: EntityType; value: string; metadata_json?: any }): Promise<Entity> {
  const res = await apiFetch(`${API_BASE}/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investigation_id: investigationId, ...data })
  });
  if (!res.ok) throw new Error('Failed to create entity');
  return res.json();
}

export async function deleteEntity(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/entities/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete entity');
}


// --- Relationship APIs ---
export async function fetchRelationships(invId: string): Promise<Relationship[]> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/relationships`);
  if (!res.ok) throw new Error('Failed to fetch relationships');
  return res.json();
}

export async function createRelationship(data: {
  source_id: string;
  target_id: string;
  relation_type: string;
  confidence?: ConfidenceLevel;
}): Promise<Relationship> {
  const res = await apiFetch(`${API_BASE}/relationships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investigation_id: 'default', ...data })
  });
  if (!res.ok) throw new Error('Failed to create relationship');
  return res.json();
}

export async function deleteRelationship(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/relationships/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete relationship');
}


// --- Graph APIs ---
export async function fetchGraph(invId: string) {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/graph`);
  if (!res.ok) throw new Error('Failed to fetch graph data');
  return res.json();
}


// --- Note APIs ---
export async function fetchNotes(invId: string): Promise<Note[]> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/notes`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

export async function createNote(invId: string, data: { title: string; content: string }): Promise<Note> {
  const res = await apiFetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investigation_id: invId, ...data })
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

export async function updateNote(noteId: string, data: { title?: string; content?: string }): Promise<Note> {
  const res = await apiFetch(`${API_BASE}/notes/${noteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update note');
  return res.json();
}

export async function deleteNote(noteId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/notes/${noteId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete note');
}


// --- OSINT Scan Execution API ---
export async function triggerScan(invId: string, targetOverride?: string) {
  const url = targetOverride
    ? `${API_BASE}/investigations/${invId}/scan?target_override=${encodeURIComponent(targetOverride)}`
    : `${API_BASE}/investigations/${invId}/scan`;
  const res = await apiFetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to execute OSINT scan');
  return res.json();
}

export const runScan = triggerScan;


// --- Evidence APIs ---
export async function fetchEvidence(invId: string) {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/evidence`);
  if (!res.ok) throw new Error('Failed to fetch evidence');
  return res.json();
}


// --- Snapshots APIs ---
export async function fetchSnapshots(invId: string): Promise<Snapshot[]> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/snapshots`);
  if (!res.ok) throw new Error('Failed to fetch snapshots');
  return res.json();
}

export async function createSnapshot(invId: string, title: string, notes?: string): Promise<Snapshot> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, notes })
  });
  if (!res.ok) throw new Error('Failed to capture snapshot');
  return res.json();
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/snapshots/${snapshotId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete snapshot');
}

export async function compareSnapshots(invId: string, snapA: string, snapB: string): Promise<SnapshotDiffResponse> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/snapshots/compare?snap_a=${snapA}&snap_b=${snapB}`);
  if (!res.ok) throw new Error('Failed to compare snapshots');
  return res.json();
}


// --- Timeline APIs ---
export async function fetchTimeline(invId: string): Promise<TimelineEvent[]> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/timeline`);
  if (!res.ok) throw new Error('Failed to fetch timeline');
  return res.json();
}


// --- AI Configuration & Analysis APIs ---
export async function fetchAIConfig() {
  const res = await apiFetch(`${API_BASE}/ai/config`);
  if (!res.ok) throw new Error('Failed to fetch AI configuration');
  return res.json();
}

export async function updateAIConfig(data: any) {
  const res = await apiFetch(`${API_BASE}/ai/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update AI configuration');
  return res.json();
}

export async function analyzeInvestigation(invId: string, userQuery?: string) {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_query: userQuery })
  });
  if (!res.ok) throw new Error('Failed to execute AI analysis');
  return res.json();
}


// --- PDF Exporter API ---
export async function downloadInvestigationPDF(invId: string, targetTitle: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/export/pdf`);
  if (!res.ok) throw new Error('Failed to download investigation PDF report');

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = targetTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');
  a.download = `AEGIS_Report_${safeName}_${invId.substring(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}


// =========================================================================
// --- AEGIS-I4C: Live Multi-Agent Streaming & Triage API Methods ----------
// =========================================================================

export async function fetchSampleComplaints(): Promise<SampleComplaintItem[]> {
  const res = await apiFetch(`${API_BASE}/complaints/samples`);
  if (!res.ok) throw new Error('Failed to fetch sample complaints');
  return res.json();
}

export async function parseComplaint(payload: {
  raw_text: string;
  source_channel?: string;
  complainant_name?: string;
  complainant_contact?: string;
}): Promise<ComplaintParseResponse> {
  const res = await apiFetch(`${API_BASE}/complaints/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to parse complaint');
  return res.json();
}

export async function ingestComplaint(payload: {
  raw_text: string;
  source_channel?: string;
  complainant_name?: string;
  complainant_contact?: string;
  auto_create_investigation?: boolean;
}) {
  const res = await apiFetch(`${API_BASE}/complaints/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to ingest complaint');
  return res.json();
}

export async function fetchIncidentTickets(): Promise<IncidentTicket[]> {
  const res = await apiFetch(`${API_BASE}/complaints/tickets`);
  if (!res.ok) throw new Error('Failed to fetch incident tickets');
  return res.json();
}

export async function fetchIncidentTicketById(ticketId: string): Promise<IncidentTicket> {
  const res = await apiFetch(`${API_BASE}/complaints/tickets/${ticketId}`);
  if (!res.ok) throw new Error('Failed to fetch incident ticket');
  return res.json();
}

export async function fetchMuleTransactions(invId: string) {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/transactions`);
  if (!res.ok) throw new Error('Failed to fetch mule transactions');
  return res.json();
}

export async function fetchAuditLedger(invId: string): Promise<AuditLedgerEntry[]> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/ledger`);
  if (!res.ok) throw new Error('Failed to fetch audit ledger');
  return res.json();
}

export async function verifyAuditLedger(invId: string): Promise<LedgerVerificationResponse> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/ledger/verify`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to verify audit ledger integrity');
  return res.json();
}

export async function fetchLegalDirectives(invId: string): Promise<LegalDirective[]> {
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/directives`);
  if (!res.ok) throw new Error('Failed to fetch legal directives');
  return res.json();
}

export async function downloadLegalFreezeNoticePDF(invId: string, directiveId?: string): Promise<void> {
  const query = directiveId ? `?directive_id=${encodeURIComponent(directiveId)}` : '';
  const res = await apiFetch(`${API_BASE}/investigations/${invId}/export/legal-notice${query}`);
  if (!res.ok) throw new Error('Failed to download Section 94 BNSS Freeze Notice PDF');

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BNSS_94_Freeze_Notice_${invId.substring(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function checkMuleIntel(vpa: string) {
  const res = await apiFetch(`${API_BASE}/threat-intel/mule-check/${encodeURIComponent(vpa)}`);
  if (!res.ok) throw new Error('Failed to check mule threat intel');
  return res.json();
}

/**
 * Connects to the SSE Live Multi-Agent Triage Stream.
 * Processes real-time event frames and invokes callback for each stage.
 */
export async function streamAutonomousTriage(
  payload: {
    raw_text: string;
    source_channel?: string;
    complainant_name?: string;
    complainant_contact?: string;
  },
  onEvent: (eventType: string, eventData: any) => void,
  onError?: (err: any) => void,
  onComplete?: () => void
): Promise<() => void> {
  let isCancelled = false;

  const controller = new AbortController();
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  fetch(`${API_BASE}/triage/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok || !response.body) {
        throw new Error(`SSE streaming failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (!isCancelled) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = 'message';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            try {
              const parsedData = JSON.parse(dataStr);
              onEvent(currentEvent, parsedData);
            } catch (err) {
              console.warn('Failed to parse SSE data frame:', dataStr, err);
            }
          }
        }
      }

      if (onComplete) onComplete();
    })
    .catch((err) => {
      if (!isCancelled) {
        if (onError) onError(err);
        else console.error('SSE Stream Error:', err);
      }
    });

  return () => {
    isCancelled = true;
    controller.abort();
  };
}

