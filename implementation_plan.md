# TRACE — Comprehensive Multi-Phase Implementation Plan

TRACE is an open-source digital investigation workspace, graph visualization engine, and automated OSINT reconnaissance suite. It is designed to work completely out-of-the-box for free, with optional "Bring Your Own API Key" (BYO-API) modules for advanced AI Analysis and Leak Monitoring.

---

## Architecture & API Key Strategy

TRACE divides its capabilities into **Free/Local** and **Optional/BYO-API** modules to ensure zero barrier to entry:

| Layer / Phase | API Key Requirement | Cost | Technology Stack |
| :--- | :--- | :--- | :--- |
| **Phase 1: Workspace** | None (100% Local) | Free | React Flow, FastAPI, SQLite |
| **Phase 2: OSINT Infra** | None (100% Local) | Free | `dnspython`, `crt.sh`, `ipwhois` |
| **Layer 2: Web Scraper** | None (100% Local) | Free | `BeautifulSoup` / HTML Parsers |
| **Layer 3: Social Finder** | None (100% Local) | Free | Sherlock username signatures |
| **Translation Layer** | None (100% Local) | Free | Python dictionary mappings |
| **Phase 4: AI Analysis** | **Optional (BYO-API)** | Free / Paid | Gemini Free Key or Local Ollama |
| **Layer 4: Threat Intel** | **Optional (BYO-API)** | Cheap ($3.50) | HaveIBeenPwned API key |

---

## 6-Phase Roadmap

### Phase 1 — Investigation Workspace (Built)
* **Goal**: Core case management, manually created entities & relationships, interactive graph workspace, notes panel.
* **Tech**: FastAPI + React Flow + SQLite.

### Phase 2 — OSINT Infrastructure & Web Scraper (Built)
* **Goal**: Non-blocking automated collection and entity normalization.
* **DNS, Cert & IP Collectors**: Queries public DNS, `crt.sh`, and `ipapi.co` registries.
* **Entity Normalization Engine**: Cleaning domains/IPs/ASNs. Deduplicates nodes dynamically.
* **Layer 2 Web Scraper (Built)**: Ingests target website HTML to extract tracking IDs (`UA-XXXXX`, `G-XXXXXX`, `pub-XXXXX`), copyright corporate entities, contact emails, and telephone numbers as normalized graph nodes.

### Phase 3 — Intelligence & Timelines (Built)
* **Goal**: Lineage tracking, evidence confidence rating, temporal timeline, snapshot comparison.
* **Evidence Provenance**: Links every node and edge to the raw records with confidence levels (`CONFIRMED`, `OBSERVED`, `INFERRED`).
* **Timeline View**: Visual horizontal slider tracking when elements appeared or changed.
* **Snapshot Diff Engine**: Compares `Snapshot #1` vs `Snapshot #2` to calculate delta (green cards for added, red for removed, amber for changed).

### Phase 4 — Translation Layer & AI Analysis (Optional BYO-API)
* **Goal**: Convert complex jargon into plain English and enable AI summaries.
* **Deterministic Translation Layer**: Dictionary mapping that translates labels (e.g. `MX` -> `📧 Mail Server`, `resolves_to` -> `lives on server at`).
* **AI Analysis (BYO-API)**: Grounded analysis and Q&A chat. Supports:
  - **Google Gemini API**: Free developer tier key.
  - **Ollama**: 100% local models (Llama 3, Mistral) running on the user's computer.

### Phase 5 — Layer 3: Human & Social Footprint (Built)
* **Goal**: Track people, usernames, and profiles.
* **Social & Username Signature Engine (Built)**: Runs non-blocking parallel username signature checks across 20+ major social networks (GitHub, Reddit, Keybase, Telegram, Medium, Dev.to, DockerHub, ProductHunt, HackerNews, Pinterest, etc.).
* **Social Node Graphing**: Automatically connects `USERNAME` and profile `URL` nodes with `has_profile` and `associated_with` edges.

### Phase 6 — Layer 4: Threat Intel & Leaks (Optional BYO-API)
* **Goal**: Identify compromised assets.
* **HaveIBeenPwned (BYO-API)**: Optional key ($3.50/mo) provided by the user to check if emails/domains appear in public data breaches.
* **Leak Database Check**: Searches public credential dump lists.

---

## User Review Required

> [!IMPORTANT]
> **Out-of-the-Box Experience**: TRACE will NOT block execution or ask for keys during setup. The API settings page will let users input their own Gemini or HaveIBeenPwned keys only if they click to unlock those specific features.

---

## Verification Plan

### Automated Verification
- **Test Ingestion & Deduplication**: Run unit tests verifying zero duplicates.
- **Collector Mocks**: Ensure tests pass even when external public services are slow.

### Manual Verification
1. Create Case -> Launch Scan -> Verify live graph rendering.
2. Ingest `google.com` -> Select node -> Verify plain-English details in side drawer.
3. Supply Gemini Key -> Ask AI "What is the security risk of this layout?" -> Verify grounded answers.
