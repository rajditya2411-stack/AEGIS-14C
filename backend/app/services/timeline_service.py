from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.models import Entity, Evidence, Note, Snapshot, Investigation
from app.schemas import TimelineEventResponse

class TimelineService:
    @staticmethod
    async def get_investigation_timeline(
        db: AsyncSession,
        investigation_id: str
    ) -> List[TimelineEventResponse]:
        events: List[TimelineEventResponse] = []

        # 1. Fetch Investigation
        inv_stmt = select(Investigation).where(Investigation.id == investigation_id)
        inv = (await db.execute(inv_stmt)).scalar_one_or_none()
        if not inv:
            return []

        events.append(TimelineEventResponse(
            id=f"inv-start-{inv.id}",
            timestamp=inv.created_at,
            event_type="CASE_START",
            title="Investigation Opened",
            description=f"Case '{inv.title}' initiated with target {inv.target}",
            entity_type="DOMAIN" if "@" not in inv.target else "EMAIL",
            entity_value=inv.target,
            source="Manual",
            confidence="CONFIRMED"
        ))

        # 2. Fetch Entities first_seen
        ent_stmt = select(Entity).where(Entity.investigation_id == investigation_id)
        entities = (await db.execute(ent_stmt)).scalars().all()
        for ent in entities:
            events.append(TimelineEventResponse(
                id=f"ent-seen-{ent.id}",
                timestamp=ent.first_seen,
                event_type="DISCOVERY",
                title=f"Discovered {ent.entity_type}",
                description=f"Entity '{ent.value}' first observed on network",
                entity_type=ent.entity_type,
                entity_value=ent.value,
                source=ent.metadata_json.get("source", "OSINT"),
                confidence="OBSERVED"
            ))

        # 3. Fetch Evidence logs
        ev_stmt = select(Evidence).where(
            (Evidence.entity_id.in_([e.id for e in entities])) |
            (Evidence.entity_id.is_(None))
        )
        evidence_records = (await db.execute(ev_stmt)).scalars().all()
        for ev in evidence_records:
            ev_type = "EVIDENCE"
            if "DNS" in ev.source_name:
                ev_type = "DNS"
            elif "crt.sh" in ev.source_name or "cert" in ev.source_name.lower():
                ev_type = "CERTIFICATE"
            elif "ip" in ev.source_name.lower():
                ev_type = "IP_SHIFT"

            events.append(TimelineEventResponse(
                id=f"ev-{ev.id}",
                timestamp=ev.observed_at,
                event_type=ev_type,
                title=f"Evidence Logged ({ev.source_name})",
                description=ev.raw_record,
                entity_type=None,
                entity_value=None,
                source=ev.source_name,
                confidence=ev.confidence
            ))

        # 4. Fetch Snapshots
        snap_stmt = select(Snapshot).where(Snapshot.investigation_id == investigation_id)
        snapshots = (await db.execute(snap_stmt)).scalars().all()
        for snap in snapshots:
            events.append(TimelineEventResponse(
                id=f"snap-{snap.id}",
                timestamp=snap.created_at,
                event_type="SNAPSHOT",
                title=f"Snapshot #{snap.version} Captured",
                description=f"Graph frozen at {snap.entities_count} entities and {snap.relationships_count} edges. Notes: {snap.notes or 'None'}",
                entity_type=None,
                entity_value=None,
                source="System",
                confidence="CONFIRMED"
            ))

        # 5. Fetch Notes
        notes_stmt = select(Note).where(Note.investigation_id == investigation_id)
        notes = (await db.execute(notes_stmt)).scalars().all()
        for note in notes:
            events.append(TimelineEventResponse(
                id=f"note-{note.id}",
                timestamp=note.created_at,
                event_type="NOTE",
                title=f"Analyst Note: {note.title}",
                description=note.content,
                entity_type=None,
                entity_value=None,
                source="Analyst",
                confidence="CONFIRMED"
            ))

        # Sort all events chronologically descending (newest first)
        events.sort(key=lambda x: x.timestamp, reverse=True)
        return events
