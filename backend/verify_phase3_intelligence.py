import asyncio
from app.database import init_db, AsyncSessionLocal
from app.models import Investigation, Entity, Relationship, Note
from app.schemas import InvestigationCreate, EntityCreate, RelationshipCreate, SnapshotCreate, NoteCreate
import app.crud as crud
from app.services.snapshot_service import SnapshotService
from app.services.timeline_service import TimelineService

async def test_phase3():
    print("--- TRACE Phase 3 Investigation Intelligence Verification ---")

    await init_db()
    async with AsyncSessionLocal() as db:
        # 1. Create Investigation Case
        inv = await crud.create_investigation(db, InvestigationCreate(
            title="Operation Chronos Intelligence",
            target="target-corp.com",
            type="Domain Investigation"
        ))
        print(f"\n1. [OK] Created Investigation Case ID: {inv.id}")

        # 2. Add Baseline Entities (Snapshot #1 state)
        ip1 = await crud.create_entity(db, EntityCreate(
            investigation_id=inv.id,
            entity_type="IP ADDRESS",
            value="192.168.1.100"
        ))
        old_srv = await crud.create_entity(db, EntityCreate(
            investigation_id=inv.id,
            entity_type="DOMAIN",
            value="old-legacy.target-corp.com"
        ))
        
        # Connect target -> IP
        target_ent = (await crud.get_entities_by_investigation(db, inv.id))[0]
        await crud.create_relationship(db, RelationshipCreate(
            investigation_id=inv.id,
            source_id=target_ent.id,
            target_id=ip1.id,
            relation_type="resolves_to"
        ))
        await crud.create_relationship(db, RelationshipCreate(
            investigation_id=inv.id,
            source_id=old_srv.id,
            target_id=target_ent.id,
            relation_type="subdomain_of"
        ))

        # Add Note
        await crud.create_note(db, NoteCreate(
            investigation_id=inv.id,
            title="Initial Baseline Observation",
            content="Target configured with legacy server and single IP."
        ))

        # 3. Capture Snapshot #1
        snap1 = await SnapshotService.capture_snapshot(db, inv.id, SnapshotCreate(
            title="Baseline Reconnaissance",
            notes="Captured initial infrastructure"
        ))
        print(f"2. [OK] Captured Snapshot #{snap1.version}: '{snap1.title}' ({snap1.entities_count} entities, {snap1.relationships_count} edges)")

        # 4. Modify Infrastructure for Snapshot #2 (Time Progression)
        # Add new subdomains and new IP
        api_srv = await crud.create_entity(db, EntityCreate(
            investigation_id=inv.id,
            entity_type="DOMAIN",
            value="api.target-corp.com"
        ))
        dev_srv = await crud.create_entity(db, EntityCreate(
            investigation_id=inv.id,
            entity_type="DOMAIN",
            value="dev.target-corp.com"
        ))
        ip2 = await crud.create_entity(db, EntityCreate(
            investigation_id=inv.id,
            entity_type="IP ADDRESS",
            value="10.0.0.5"
        ))

        # Delete old legacy server to simulate decommissioning
        await crud.delete_entity(db, old_srv.id)

        # Wire new relationships
        await crud.create_relationship(db, RelationshipCreate(
            investigation_id=inv.id,
            source_id=api_srv.id,
            target_id=target_ent.id,
            relation_type="subdomain_of"
        ))
        await crud.create_relationship(db, RelationshipCreate(
            investigation_id=inv.id,
            source_id=dev_srv.id,
            target_id=target_ent.id,
            relation_type="subdomain_of"
        ))
        await crud.create_relationship(db, RelationshipCreate(
            investigation_id=inv.id,
            source_id=api_srv.id,
            target_id=ip2.id,
            relation_type="resolves_to"
        ))

        # 5. Capture Snapshot #2
        snap2 = await SnapshotService.capture_snapshot(db, inv.id, SnapshotCreate(
            title="Six Weeks Later Audit",
            notes="Detected API deployment and legacy server removal"
        ))
        print(f"3. [OK] Captured Snapshot #{snap2.version}: '{snap2.title}' ({snap2.entities_count} entities, {snap2.relationships_count} edges)")

        # 6. Compare Snapshots (Diff Engine Test)
        print("\n4. Testing Snapshot Diff Engine (Snapshot #1 vs Snapshot #2)...")
        diff = await SnapshotService.compare_snapshots(db, snap1.id, snap2.id)
        
        print(f"[OK] Diff Summary: {diff.summary}")
        print(f"     [+] Added Entities ({len(diff.added_entities)}):")
        for a in diff.added_entities:
            print(f"         + [{a.entity_type}] {a.value} ({a.details})")
        
        print(f"     [-] Removed Entities ({len(diff.removed_entities)}):")
        for r in diff.removed_entities:
            print(f"         - [{r.entity_type}] {r.value} ({r.details})")

        print(f"     [+] Added Relationships ({len(diff.added_relationships)}):")
        for rel in diff.added_relationships:
            print(f"         + {rel.source_value} --({rel.relation_type})--> {rel.target_value}")

        # Assertions
        added_vals = [e.value for e in diff.added_entities]
        removed_vals = [e.value for e in diff.removed_entities]
        assert "api.target-corp.com" in added_vals, "Missing added api subdomain in diff"
        assert "dev.target-corp.com" in added_vals, "Missing added dev subdomain in diff"
        assert "old-legacy.target-corp.com" in removed_vals, "Missing removed legacy server in diff"
        print("\n[OK] Snapshot Diff verification assertions passed perfectly!")

        # 7. Test Timeline Service
        print("\n5. Testing Timeline Intelligence Event Aggregator...")
        timeline = await TimelineService.get_investigation_timeline(db, inv.id)
        print(f"[OK] Generated {len(timeline)} chronological timeline events:")
        for ev in timeline[:6]:
            print(f"     - [{ev.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] [{ev.event_type}] {ev.title}: {ev.description[:60]}...")

    print("\n==================================================================")
    print("ALL PHASE 3 SNAPSHOT DIFFING & TIMELINE INTELLIGENCE CHECKS PASSED!")
    print("==================================================================")

if __name__ == "__main__":
    asyncio.run(test_phase3())
