"""
AEGIS-14C Multi-Hop Mule Ledger & Graph Algorithm Engine.
Implements NetworkX-driven graph analysis for financial crime investigations:
- Bi-directional BFS money trail tracing (Layer 1 -> Layer 5)
- Ingestion of standard Indian bank statement CSVs (HDFC, SBI, ICICI, Axis, Paytm)
- Fan-In / Fan-Out velocity anomaly scoring
- Johnson's cycle detection algorithm for circular laundering loops
- Layering depth calculation & high-risk cashout / ATM exit hub identification
"""
import csv
import io
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set
import networkx as nx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import MuleTransaction, Entity, Relationship, Investigation
import app.crud as crud
from app.agents.threat_intel_store import ThreatIntelStore
from app.services.forensic_hasher import ForensicHasher


class MuleLedgerEngine:
    """
    Autonomous Multi-Hop Financial Ledger & Graph Algorithm Engine.
    """

    @staticmethod
    def parse_bank_statement_csv(csv_content: str, source_account: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Parses standard bank statement CSV formats (HDFC, SBI, ICICI, Axis, Paytm Bank).
        Extracts Date/Timestamp, Transaction Type, UTR / Ref Number, Counterparty (VPA or Account),
        Debit / Credit amounts, and Bank details.
        """
        transactions = []
        reader = csv.DictReader(io.StringIO(csv_content.strip()))
        
        # Normalize field names to lowercase without whitespace
        for row in reader:
            normalized_row = {k.strip().lower().replace(' ', '_').replace('.', ''): (v or '').strip() for k, v in row.items() if k}
            
            # Identify counterparty
            dest = (
                normalized_row.get('counterparty') or
                normalized_row.get('beneficiary_account') or
                normalized_row.get('beneficiary_vpa') or
                normalized_row.get('to_account') or
                normalized_row.get('destination') or
                normalized_row.get('receiver') or
                ''
            )

            # Identify source
            src = (
                source_account or
                normalized_row.get('source_account') or
                normalized_row.get('sender_account') or
                normalized_row.get('from_account') or
                normalized_row.get('remitter_account') or
                'VICTIM_ACCOUNT'
            )

            # Extract amount
            raw_amt = (
                normalized_row.get('amount') or
                normalized_row.get('debit') or
                normalized_row.get('withdrawal') or
                normalized_row.get('txn_amount') or
                '0'
            )
            clean_amt = re.sub(r'[^0-9.]', '', str(raw_amt))
            try:
                amount = int(float(clean_amt)) if clean_amt else 0
            except ValueError:
                amount = 0

            # Extract UTR / RRN
            utr = (
                normalized_row.get('utr') or
                normalized_row.get('rrn') or
                normalized_row.get('reference_no') or
                normalized_row.get('ref_no') or
                normalized_row.get('transaction_id') or
                f"TXN{len(transactions)+10001}"
            )

            # Bank details
            bank = (
                normalized_row.get('bank') or
                normalized_row.get('destination_bank') or
                normalized_row.get('ifsc') or
                'Commercial Bank'
            )

            # Timestamp
            raw_date = (
                normalized_row.get('date') or
                normalized_row.get('transaction_date') or
                normalized_row.get('timestamp') or
                datetime.now(timezone.utc).isoformat()
            )

            if dest and amount > 0:
                transactions.append({
                    "source": src,
                    "destination": dest,
                    "amount": amount,
                    "utr": utr,
                    "destination_bank": bank,
                    "timestamp": raw_date
                })

        return transactions

    @staticmethod
    def build_networkx_graph(transactions: List[Dict[str, Any]]) -> nx.DiGraph:
        """Constructs a directed NetworkX graph weighted with transaction amounts and counts."""
        G = nx.DiGraph()
        for tx in transactions:
            u = tx["source"]
            v = tx["destination"]
            amt = tx["amount"]
            utr = tx.get("utr", "")
            
            if G.has_edge(u, v):
                G[u][v]["weight"] += amt
                G[u][v]["count"] += 1
                G[u][v]["utrs"].append(utr)
            else:
                G.add_edge(u, v, weight=amt, count=1, utrs=[utr], bank=tx.get("destination_bank", ""))

        return G

    @staticmethod
    def analyze_multi_hop_flow(
        transactions: List[Dict[str, Any]],
        seed_accounts: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Executes deep NetworkX multi-hop money flow analytics:
        1. Bi-directional Breadth-First Search (BFS) Layer mapping (Layer 1 -> Layer 5)
        2. Fan-In / Fan-Out velocity score calculation
        3. Johnson's elementary cycles detection for circular laundering
        4. High-risk cashout exit identification (nodes with 0 out-degree or crypto off-ramps)
        """
        if not transactions:
            return {
                "nodes": [],
                "edges": [],
                "layers": {},
                "cycles": [],
                "hubs": [],
                "total_flow": 0
            }

        G = MuleLedgerEngine.build_networkx_graph(transactions)

        # 1. Determine Root / Seed Ingress Nodes
        all_sources = {tx["source"] for tx in transactions}
        all_destinations = {tx["destination"] for tx in transactions}
        
        # If no seeds provided, treat nodes with in-degree == 0 as root sources
        if not seed_accounts:
            root_seeds = [n for n in G.nodes if G.in_degree(n) == 0]
            if not root_seeds:
                root_seeds = list(all_sources)[:1]
        else:
            root_seeds = [s for s in seed_accounts if s in G.nodes]
            if not root_seeds:
                root_seeds = list(G.nodes)[:1]

        # 2. Multi-Hop BFS Layering Assignment (Layer 1 -> Layer 5)
        node_layers: Dict[str, int] = {}
        for root in root_seeds:
            node_layers[root] = 0
            visited = {root}
            queue = [(root, 0)]
            while queue:
                curr, depth = queue.pop(0)
                for neighbor in G.successors(curr):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        next_depth = min(depth + 1, 5) # Cap at layer 5
                        node_layers[neighbor] = next_depth
                        queue.append((neighbor, next_depth))

        # Assign remaining unvisited nodes
        for node in G.nodes:
            if node not in node_layers:
                node_layers[node] = 1

        # 3. Detect Circular Laundering Cycles (Johnson's Algorithm)
        cycles = []
        try:
            simple_cycles = list(nx.simple_cycles(G))
            for c in simple_cycles:
                if len(c) > 1:
                    cycle_path = c + [c[0]]
                    cycles.append({
                        "cycle_path": cycle_path,
                        "length": len(c),
                        "description": f"Circular Laundering Loop ({len(c)} hops): {' -> '.join(cycle_path)}",
                        "severity": "CRITICAL",
                        "risk_score": 95
                    })
        except Exception:
            pass

        # 4. Fan-In / Fan-Out Velocity & Mule Hub Scoring
        hubs = []
        analyzed_nodes = []
        for node in G.nodes:
            in_deg = G.in_degree(node)
            out_deg = G.out_degree(node)
            in_amt = sum(G[u][node]["weight"] for u in G.predecessors(node))
            out_amt = sum(G[node][v]["weight"] for v in G.successors(node))
            layer = node_layers.get(node, 1)

            # Fan-out ratio: incoming micro-deposits converted into rapid multi-hop dispersion
            velocity_ratio = round(out_amt / (in_amt + 1), 2)
            fan_out_degree = out_deg
            fan_in_degree = in_deg

            intel = ThreatIntelStore.check_mule_account(node)
            risk_score = intel["details"]["risk_score"] if intel["matched"] else min(50 + (in_deg * 8) + (out_deg * 10), 98)

            is_cashout_exit = (out_deg == 0 and layer >= 2) or "atm" in node.lower() or "crypto" in node.lower()
            is_hub = in_deg >= 2 or out_deg >= 2 or velocity_ratio >= 0.85

            role = "Victim Source" if layer == 0 else (
                "Cashout Exit / ATM" if is_cashout_exit else (
                    f"Layer {layer} Mule Hub" if is_hub else f"Layer {layer} Intermediary"
                )
            )

            node_data = {
                "vpa_or_account": node,
                "layer": layer,
                "in_degree": in_deg,
                "out_degree": out_deg,
                "in_amount": in_amt,
                "out_amount": out_amt,
                "velocity_ratio": velocity_ratio,
                "risk_score": risk_score,
                "role": role,
                "is_mule_hub": is_hub,
                "is_cashout_exit": is_cashout_exit,
                "threat_intel_match": intel["matched"]
            }
            analyzed_nodes.append(node_data)
            if is_hub or is_cashout_exit:
                hubs.append(node_data)

        # 5. Extract Edge Flow Manifest
        analyzed_edges = []
        for u, v, data in G.edges(data=True):
            analyzed_edges.append({
                "source": u,
                "destination": v,
                "total_amount": data["weight"],
                "tx_count": data["count"],
                "utrs": data.get("utrs", []),
                "source_layer": node_layers.get(u, 0),
                "destination_layer": node_layers.get(v, 1),
                "bank": data.get("bank", "Commercial Bank")
            })

        total_flow = sum(tx["amount"] for tx in transactions)

        return {
            "total_transactions": len(transactions),
            "total_flow_amount": total_flow,
            "node_count": len(analyzed_nodes),
            "edge_count": len(analyzed_edges),
            "nodes": sorted(analyzed_nodes, key=lambda x: (x["layer"], -x["risk_score"])),
            "edges": analyzed_edges,
            "cycles": cycles,
            "hubs": sorted(hubs, key=lambda x: -x["risk_score"]),
            "root_sources": root_seeds
        }

    @staticmethod
    async def ingest_csv_and_sync_graph(
        db: AsyncSession,
        investigation_id: str,
        csv_content: str,
        source_account: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Full end-to-end ingestion pipeline:
        1. Calculates Section 63 BSA SHA-256 hash of raw CSV evidence upon intake
        2. Parses CSV transactions and executes NetworkX graph analysis
        3. Persists nodes and edges into SQLite (entities, 
elationships, mule_transactions)
        4. Logs tamper-evident entry to Audit Ledger
        """
        # 1. Forensic Hash Intake
        custody_envelope = ForensicHasher.hash_text(
            text=csv_content,
            artifact_name="Bank_Statement_CSV_Intake",
            source_uri=f"investigation://{investigation_id}/bank_statement.csv"
        )

        # 2. Parse & Analyze
        txs = MuleLedgerEngine.parse_bank_statement_csv(csv_content, source_account=source_account)
        analysis = MuleLedgerEngine.analyze_multi_hop_flow(txs)

        # 3. Persist to DB
        # Fetch existing entities
        stmt = select(Entity).where(Entity.investigation_id == investigation_id)
        existing_ents = (await db.execute(stmt)).scalars().all()
        ent_map = {e.value: e for e in existing_ents}

        # Create/Update Entities
        for n in analysis["nodes"]:
            val = n["vpa_or_account"]
            etype = "MULE_ACCOUNT" if n["risk_score"] >= 70 or n["is_mule_hub"] else "BANK_ACCOUNT"
            if val not in ent_map:
                ent = Entity(
                    investigation_id=investigation_id,
                    entity_type=etype,
                    value=val,
                    raw_value=val,
                    metadata_json={
                        "type": etype,
                        "tier": n["layer"],
                        "role": n["role"],
                        "risk_score": n["risk_score"],
                        "in_amount": n["in_amount"],
                        "out_amount": n["out_amount"],
                        "is_mule_hub": n["is_mule_hub"],
                        "is_cashout_exit": n["is_cashout_exit"]
                    }
                )
                db.add(ent)
                await db.commit()
                await db.refresh(ent)
                ent_map[val] = ent

        # Create MuleTransactions & Relationships
        for e in analysis["edges"]:
            src_val = e["source"]
            dst_val = e["destination"]
            src_ent = ent_map.get(src_val)
            dst_ent = ent_map.get(dst_val)

            if src_ent and dst_ent:
                # Add relationship edge if not existing
                rel_stmt = select(Relationship).where(
                    Relationship.investigation_id == investigation_id,
                    Relationship.source_id == src_ent.id,
                    Relationship.target_id == dst_ent.id
                )
                existing_rel = (await db.execute(rel_stmt)).scalars().first()
                if not existing_rel:
                    rel = Relationship(
                        investigation_id=investigation_id,
                        source_id=src_ent.id,
                        target_id=dst_ent.id,
                        relation_type="MULE_TRANSFER_FLOW",
                        confidence="CONFIRMED",
                        metadata_json={
                            "amount": e["total_amount"],
                            "tx_count": e["tx_count"],
                            "bank": e["bank"],
                            "utrs": e.get("utrs", [])
                        }
                    )
                    db.add(rel)

                # Persist MuleTransaction record
                mule_tx = MuleTransaction(
                    investigation_id=investigation_id,
                    source_vpa=src_val,
                    destination_vpa=dst_val,
                    destination_bank=e.get("bank", "Commercial Bank"),
                    amount=e["total_amount"],
                    tier_level=e["destination_layer"],
                    risk_score=ent_map[dst_val].metadata_json.get("risk_score", 75),
                    is_cyclic=any(src_val in c["cycle_path"] and dst_val in c["cycle_path"] for c in analysis["cycles"]),
                    is_rapid_split=ent_map[src_val].metadata_json.get("is_mule_hub", False),
                    metadata_json={"utrs": e.get("utrs", [])}
                )
                db.add(mule_tx)

        await db.commit()

        # 4. Record to Audit Ledger (Sec 63 BSA Proof)
        await crud.append_audit_ledger_entry(
            db=db,
            investigation_id=investigation_id,
            action_type="BANK_STATEMENT_CSV_INGESTED",
            actor="AEGIS-14C NetworkX Mule Ledger Engine",
            data_payload={
                "custody_id": custody_envelope["custody_id"],
                "sha256": custody_envelope["sha256"],
                "transactions_ingested": len(txs),
                "total_flow_inr": analysis["total_flow_amount"],
                "mule_hubs_detected": len(analysis["hubs"]),
                "cycles_detected": len(analysis["cycles"])
            }
        )

        return {
            "custody_envelope": custody_envelope,
            "analysis": analysis
        }
