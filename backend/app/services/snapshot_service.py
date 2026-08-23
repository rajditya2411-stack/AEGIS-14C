from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime

from app.models import Snapshot, Entity, Relationship, Investigation
from app.schemas import (
    SnapshotCreate, SnapshotResponse,
    SnapshotDiffResponse, DiffEntityItem, DiffRelationshipItem
)

class SnapshotService:
    @staticmethod
    async def capture_snapshot(
        db: AsyncSession,
        investigation_id: str,
        data: SnapshotCreate
    ) -> Snapshot:
        # 1. Fetch current entities
        ent_stmt = select(Entity).where(Entity.investigation_id == investigation_id)
        entities = (await db.execute(ent_stmt)).scalars().all()

        # 2. Fetch current relationships with eager loaded entities
        rel_stmt = select(Relationship).options(
            selectinload(Relationship.source_entity),
            selectinload(Relationship.target_entity)
        ).where(Relationship.investigation_id == investigation_id)
        relationships = (await db.execute(rel_stmt)).scalars().all()

        # 3. Calculate next version
        ver_stmt = select(func.max(Snapshot.version)).where(Snapshot.investigation_id == investigation_id)
        current_max_ver = (await db.execute(ver_stmt)).scalar() or 0
        next_ver = current_max_ver + 1

        # 4. Serialize graph state
        serialized_entities = []
        for e in entities:
            serialized_entities.append({
                "id": e.id,
                "entity_type": e.entity_type,
                "value": e.value,
                "raw_value": e.raw_value,
                "metadata_json": e.metadata_json or {},
                "first_seen": e.first_seen.isoformat(),
                "last_seen": e.last_seen.isoformat()
            })

        serialized_relationships = []
        for r in relationships:
            src_val = r.source_entity.value if r.source_entity else "unknown"
            tgt_val = r.target_entity.value if r.target_entity else "unknown"
            serialized_relationships.append({
                "id": r.id,
                "source_id": r.source_id,
                "target_id": r.target_id,
                "source_value": src_val,
                "target_value": tgt_val,
                "relation_type": r.relation_type,
                "confidence": r.confidence,
                "metadata_json": r.metadata_json or {}
            })

        graph_state = {
            "entities": serialized_entities,
            "relationships": serialized_relationships
        }

        # 5. Create Snapshot record
        snapshot = Snapshot(
            investigation_id=investigation_id,
            version=next_ver,
            title=data.title,
            notes=data.notes,
            entities_count=len(entities),
            relationships_count=len(relationships),
            graph_json=graph_state
        )
        db.add(snapshot)
        await db.commit()
        await db.refresh(snapshot)
        return snapshot

    @staticmethod
    async def get_snapshots(db: AsyncSession, investigation_id: str) -> List[Snapshot]:
        stmt = select(Snapshot).where(Snapshot.investigation_id == investigation_id).order_by(Snapshot.version.desc())
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_snapshot_by_id(db: AsyncSession, snapshot_id: str) -> Optional[Snapshot]:
        stmt = select(Snapshot).where(Snapshot.id == snapshot_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def delete_snapshot(db: AsyncSession, snapshot_id: str) -> bool:
        stmt = select(Snapshot).where(Snapshot.id == snapshot_id)
        snap = (await db.execute(stmt)).scalar_one_or_none()
        if not snap:
            return False
        await db.delete(snap)
        await db.commit()
        return True

    @staticmethod
    async def compare_snapshots(
        db: AsyncSession,
        snapshot_a_id: str,
        snapshot_b_id: str
    ) -> SnapshotDiffResponse:
        snap_a = await SnapshotService.get_snapshot_by_id(db, snapshot_a_id)
        snap_b = await SnapshotService.get_snapshot_by_id(db, snapshot_b_id)

        if not snap_a or not snap_b:
            raise ValueError("One or both snapshots not found for comparison")

        # Map entities in A and B: (entity_type, value) -> data
        ents_a: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for e in snap_a.graph_json.get("entities", []):
            ents_a[(e["entity_type"], e["value"])] = e

        ents_b: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for e in snap_b.graph_json.get("entities", []):
            ents_b[(e["entity_type"], e["value"])] = e

        added_entities: List[DiffEntityItem] = []
        removed_entities: List[DiffEntityItem] = []
        changed_entities: List[DiffEntityItem] = []

        # Find added in B
        for key, e_b in ents_b.items():
            if key not in ents_a:
                added_entities.append(DiffEntityItem(
                    entity_type=e_b["entity_type"],
                    value=e_b["value"],
                    change_type="ADDED",
                    details=f"Discovered in Snapshot #{snap_b.version}"
                ))
            else:
                # In both: check if metadata or last_seen changed
                e_a = ents_a[key]
                if e_a.get("last_seen") != e_b.get("last_seen"):
                    changed_entities.append(DiffEntityItem(
                        entity_type=e_b["entity_type"],
                        value=e_b["value"],
                        change_type="CHANGED",
                        details=f"Re-observed / updated in Snapshot #{snap_b.version}"
                    ))

        # Find removed in B (was in A, now gone)
        for key, e_a in ents_a.items():
            if key not in ents_b:
                removed_entities.append(DiffEntityItem(
                    entity_type=e_a["entity_type"],
                    value=e_a["value"],
                    change_type="REMOVED",
                    details=f"Present in Snapshot #{snap_a.version}, missing in #{snap_b.version}"
                ))

        # Map relationships in A and B
        rels_a: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
        for r in snap_a.graph_json.get("relationships", []):
            rels_a[(r["source_value"], r["target_value"], r["relation_type"])] = r

        rels_b: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
        for r in snap_b.graph_json.get("relationships", []):
            rels_b[(r["source_value"], r["target_value"], r["relation_type"])] = r

        added_relationships: List[DiffRelationshipItem] = []
        removed_relationships: List[DiffRelationshipItem] = []

        for key, r_b in rels_b.items():
            if key not in rels_a:
                added_relationships.append(DiffRelationshipItem(
                    source_value=r_b["source_value"],
                    target_value=r_b["target_value"],
                    relation_type=r_b["relation_type"],
                    change_type="ADDED"
                ))

        for key, r_a in rels_a.items():
            if key not in rels_b:
                removed_relationships.append(DiffRelationshipItem(
                    source_value=r_a["source_value"],
                    target_value=r_a["target_value"],
                    relation_type=r_a["relation_type"],
                    change_type="REMOVED"
                ))

        summary = {
            "added_entities_count": len(added_entities),
            "removed_entities_count": len(removed_entities),
            "changed_entities_count": len(changed_entities),
            "added_relationships_count": len(added_relationships),
            "removed_relationships_count": len(removed_relationships)
        }

        return SnapshotDiffResponse(
            snapshot_a_id=snap_a.id,
            snapshot_a_title=f"#{snap_a.version} {snap_a.title}",
            snapshot_a_date=snap_a.created_at,
            snapshot_b_id=snap_b.id,
            snapshot_b_title=f"#{snap_b.version} {snap_b.title}",
            snapshot_b_date=snap_b.created_at,
            added_entities=added_entities,
            removed_entities=removed_entities,
            changed_entities=changed_entities,
            added_relationships=added_relationships,
            removed_relationships=removed_relationships,
            summary=summary
        )
