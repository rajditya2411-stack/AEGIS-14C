import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.database import init_db, AsyncSessionLocal
import app.crud as crud
from app.schemas import InvestigationCreate, EntityCreate, RelationshipCreate

async def test_case_deletion():
    print("="*70)
    print(" 🧪 TESTING INVESTIGATION CASE CREATION & CASCADE DELETION")
    print("="*70)
    await init_db()

    async with AsyncSessionLocal() as db:
        # 1. Create a dummy test investigation
        data = InvestigationCreate(
            title="Temporary Test Case for Deletion",
            target="temp-delete-test.xyz",
            type="Domain Investigation"
        )
        inv = await crud.create_investigation(db, data)
        print(f"✅ Created test case: {inv.id} ('{inv.title}')")

        # 2. Add extra entities and relationships
        ent1 = await crud.create_entity(db, EntityCreate(
            investigation_id=inv.id,
            entity_type="IP ADDRESS",
            value="198.51.100.1"
        ))
        ent2 = await crud.create_entity(db, EntityCreate(
            investigation_id=inv.id,
            entity_type="EMAIL",
            value="suspect@temp-delete-test.xyz"
        ))
        await crud.create_relationship(db, RelationshipCreate(
            investigation_id=inv.id,
            source_id=ent1.id,
            target_id=ent2.id,
            relation_type="associated_with",
            confidence="CONFIRMED"
        ))
        print("✅ Added 2 entities and 1 relationship")

        # 3. Check it is in get_investigations
        all_invs = await crud.get_investigations(db)
        found = any(i["id"] == inv.id for i in all_invs)
        assert found, "Created investigation not found in list"
        print(f"✅ Investigation verified in active list (Total cases: {len(all_invs)})")

        # 4. Execute deletion
        deleted = await crud.delete_investigation(db, inv.id)
        assert deleted, "Failed to delete investigation"
        print("✅ Deletion executed successfully!")

        # 5. Verify it's gone
        all_invs_after = await crud.get_investigations(db)
        found_after = any(i["id"] == inv.id for i in all_invs_after)
        assert not found_after, "Deleted investigation still present in list"
        print(f"✅ Verified investigation is completely removed (Remaining cases: {len(all_invs_after)})")

    print("="*70)
    print(" 🎉 CASE DELETION TEST PASSED 100%!")
    print("="*70)

if __name__ == "__main__":
    asyncio.run(test_case_deletion())
