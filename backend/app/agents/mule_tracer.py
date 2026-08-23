"""
AEGIS-I4C UPI Mule-Chain Graph Tracer Subsystem.
Constructs multi-tier transaction flow graphs, detects cyclic transfers,
rapid account splitting, and flags known mule VPAs stored in threat intelligence.
"""
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime, timezone, timedelta
import random

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Entity, Relationship, MuleTransaction, Investigation
from app.agents.threat_intel_store import ThreatIntelStore
from app.normalization.engine import NormalizationEngine


class MuleTracer:
    """
    UPI Mule-Chain Graph Tracer.
    Traces multi-tier financial flows, detects laundering anomalies (cycles, rapid splitting),
    and seeds interactive transaction nodes onto the React Flow canvas.
    """

    @classmethod
    async def trace_mule_chain(
        cls,
        db: Optional[AsyncSession],
        investigation_id: str,
        seed_vpas: List[str],
        ticket_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes multi-tier mule tracing for given seed VPAs.
        Detects cyclic loops and rapid account splitting, and syncs graph nodes to DB.
        """
        if not seed_vpas:
            return {
                "investigation_id": investigation_id,
                "tier_1_count": 0,
                "tier_2_count": 0,
                "tier_3_count": 0,
                "total_transactions": 0,
                "anomalies": {"cyclic_loops": [], "rapid_splits": []},
                "transactions": [],
                "nodes": [],
                "edges": []
            }

        all_transactions: List[Dict[str, Any]] = []
        visited_edges: Set[Tuple[str, str]] = set()

        # 1. Collect cascades for each seed VPA
        for seed_vpa in seed_vpas:
            cascade = ThreatIntelStore.get_mule_cascade(seed_vpa)
            for tx in cascade:
                edge_key = (tx["source"], tx["destination"])
                if edge_key not in visited_edges:
                    visited_edges.add(edge_key)
                    all_transactions.append(tx)

        # 2. Anomaly Detection: Detect Cyclic Loops & Rapid Account Splitting
        cyclic_loops = cls._detect_cyclic_loops(all_transactions)
        rapid_splits = cls._detect_rapid_splits(all_transactions)

        # 3. Categorize Tiers & Evaluate Node Risk Scores
        nodes_map: Dict[str, Dict[str, Any]] = {}
        for tx in all_transactions:
            src = tx["source"]
            dst = tx["destination"]
            tier = tx.get("tier", 1)

            # Check intel for both accounts
            if src not in nodes_map:
                intel_src = ThreatIntelStore.check_mule_account(src)
                nodes_map[src] = {
                    "vpa": src,
                    "tier": 1 if src in seed_vpas else tier - 1,
                    "bank": tx.get("source_bank", "UPI PSP"),
                    "risk_score": intel_src["details"]["risk_score"],
                    "status": intel_src["details"]["status"],
                    "role": intel_src["details"]["tier_role"],
                    "is_mule": intel_src["matched"]
                }

            if dst not in nodes_map:
                intel_dst = ThreatIntelStore.check_mule_account(dst)
                nodes_map[dst] = {
                    "vpa": dst,
                    "tier": tier,
                    "bank": tx.get("destination_bank", "UPI PSP"),
                    "risk_score": intel_dst["details"]["risk_score"],
                    "status": intel_dst["details"]["status"],
                    "role": "Layer 3 Cashout Exit" if tier == 3 else f"Layer {tier} Intermediary",
                    "is_mule": intel_dst["matched"] or tier >= 2
                }

        # 4. Count tiers
        tier_1 = [n for n in nodes_map.values() if n["tier"] == 1]
        tier_2 = [n for n in nodes_map.values() if n["tier"] == 2]
        tier_3 = [n for n in nodes_map.values() if n["tier"] >= 3]

        # 5. Persist to SQLite Database if session provided
        created_db_txs = []
        if db:
            created_db_txs = await cls._persist_mule_graph(
                db=db,
                investigation_id=investigation_id,
                ticket_id=ticket_id,
                transactions=all_transactions,
                nodes_map=nodes_map,
                cyclic_loops=cyclic_loops,
                rapid_splits=rapid_splits
            )

        return {
            "investigation_id": investigation_id,
            "seed_vpas": seed_vpas,
            "tier_1_count": len(tier_1),
            "tier_2_count": len(tier_2),
            "tier_3_count": len(tier_3),
            "total_transactions": len(all_transactions),
            "total_flow_amount": sum(tx["amount"] for tx in all_transactions),
            "anomalies": {
                "cyclic_loops": cyclic_loops,
                "rapid_splits": rapid_splits,
                "has_cycles": len(cyclic_loops) > 0,
                "has_splits": len(rapid_splits) > 0
            },
            "nodes": list(nodes_map.values()),
            "transactions": all_transactions
        }

    @classmethod
    def _detect_cyclic_loops(cls, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detects circular funds routing (e.g. VPA_A -> VPA_B -> VPA_C -> VPA_A).
        """
        adj_list: Dict[str, List[str]] = {}
        for tx in transactions:
            s, d = tx["source"], tx["destination"]
            if s not in adj_list:
                adj_list[s] = []
            adj_list[s].append(d)

        cycles = []
        visited = set()
        rec_stack = []

        def dfs(curr: str):
            visited.add(curr)
            rec_stack.append(curr)

            for neighbor in adj_list.get(curr, []):
                if neighbor not in visited:
                    dfs(neighbor)
                elif neighbor in rec_stack:
                    # Cycle detected!
                    cycle_path = rec_stack[rec_stack.index(neighbor):] + [neighbor]
                    cycle_str = " -> ".join(cycle_path)
                    cycles.append({
                        "cycle_path": cycle_path,
                        "description": f"Cyclic Transfer Laundering Loop: {cycle_str}",
                        "severity": "CRITICAL",
                        "risk_score": 95
                    })

            rec_stack.pop()

        for node in list(adj_list.keys()):
            if node not in visited:
                dfs(node)

        return cycles

    @classmethod
    def _detect_rapid_splits(cls, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detects rapid account splitting (1 incoming transfer fan-out to >=2 accounts).
        """
        source_splits: Dict[str, List[Dict[str, Any]]] = {}
        for tx in transactions:
            s = tx["source"]
            if s not in source_splits:
                source_splits[s] = []
            source_splits[s].append(tx)

        splits = []
        for src, txs in source_splits.items():
            if len(txs) >= 2:
                total_split_amt = sum(t["amount"] for t in txs)
                destinations = [t["destination"] for t in txs]
                splits.append({
                    "source_vpa": src,
                    "split_count": len(txs),
                    "destinations": destinations,
                    "total_amount": total_split_amt,
                    "description": f"Rapid Layering Split: {src} fan-out into {len(txs)} mule accounts ({', '.join(destinations)})",
                    "severity": "HIGH",
                    "risk_score": 88
                })

        return splits

    @classmethod
    async def _persist_mule_graph(
        cls,
        db: AsyncSession,
        investigation_id: str,
        ticket_id: Optional[str],
        transactions: List[Dict[str, Any]],
        nodes_map: Dict[str, Dict[str, Any]],
        cyclic_loops: List[Dict[str, Any]],
        rapid_splits: List[Dict[str, Any]]
    ):
        """
        Saves MuleTransactions, Entity nodes, and Relationship edges into SQLite DB.
        """
        # 1. Fetch existing entities for investigation
        stmt = select(Entity).where(Entity.investigation_id == investigation_id)
        existing_entities = (await db.execute(stmt)).scalars().all()
        entity_lookup: Dict[str, Entity] = {e.value: e for e in existing_entities}

        # 2. Add or update Entity nodes for all discovered VPAs and Mules
        for vpa, meta in nodes_map.items():
            e_type = "MULE_ACCOUNT" if meta["is_mule"] else "UPI_VPA"
            if vpa not in entity_lookup:
                ent = Entity(
                    investigation_id=investigation_id,
                    entity_type=e_type,
                    value=vpa,
                    raw_value=vpa,
                    metadata_json={
                        "type": e_type,
                        "tier": meta["tier"],
                        "bank": meta["bank"],
                        "risk_score": meta["risk_score"],
                        "status": meta["status"],
                        "role": meta["role"],
                        "is_mule": meta["is_mule"]
                    }
                )
                db.add(ent)
                await db.commit()
                await db.refresh(ent)
                entity_lookup[vpa] = ent

        # 3. Create MuleTransaction records and Relationship edges
        cyclic_nodes = set()
        for c in cyclic_loops:
            cyclic_nodes.update(c.get("cycle_path", []))

        split_nodes = {s["source_vpa"] for s in rapid_splits}

        for tx in transactions:
            src_val = tx["source"]
            dst_val = tx["destination"]
            src_ent = entity_lookup.get(src_val)
            dst_ent = entity_lookup.get(dst_val)

            is_cyclic = (src_val in cyclic_nodes and dst_val in cyclic_nodes)
            is_split = (src_val in split_nodes)

            # Create MuleTransaction record
            db_tx = MuleTransaction(
                investigation_id=investigation_id,
                ticket_id=ticket_id,
                source_vpa=src_val,
                destination_vpa=dst_val,
                source_bank=tx.get("source_bank", "UPI PSP"),
                destination_bank=tx.get("destination_bank", "UPI PSP"),
                amount=tx.get("amount", 0),
                tier_level=tx.get("tier", 1),
                risk_score=90 if (is_cyclic or is_split) else 65,
                is_cyclic=is_cyclic,
                is_rapid_split=is_split,
                metadata_json=tx
            )
            db.add(db_tx)

            # Create Relationship edge in the React Flow Graph
            if src_ent and dst_ent:
                rel_type = "transfers_funds_to"
                if is_cyclic:
                    rel_type = "cyclic_flow_with"
                elif is_split:
                    rel_type = "splits_funds_to"
                elif tx.get("tier", 1) == 3:
                    rel_type = "cashes_out_to"

                rel = Relationship(
                    investigation_id=investigation_id,
                    source_id=src_ent.id,
                    target_id=dst_ent.id,
                    relation_type=rel_type,
                    confidence="CONFIRMED",
                    metadata_json={
                        "amount_inr": tx.get("amount", 0),
                        "tier": tx.get("tier", 1),
                        "is_cyclic": is_cyclic,
                        "is_split": is_split
                    }
                )
                db.add(rel)

        await db.commit()
