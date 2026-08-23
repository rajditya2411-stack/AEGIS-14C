import asyncio
from app.database import init_db, AsyncSessionLocal
from app.schemas import InvestigationCreate, EntityCreate, RelationshipCreate
import app.crud as crud

async def test():
    print("Initializing database...")
    await init_db()
    
    async with AsyncSessionLocal() as db:
        print("1. Creating investigation...")
        inv = await crud.create_investigation(db, InvestigationCreate(
            title="Example Corp Investigation",
            target="example.com",
            type="Domain Investigation"
        ))
        print(f"Created Investigation ID: {inv.id}, target entity automatically created.")

        print("2. Adding entities...")
        ip_ent = await crud.create_entity(db, EntityCreate(
            investigation_id=inv.id,
            entity_type="IP ADDRESS",
            value="192.168.1.1",
            metadata_json={"source": "Manual"}
        ))
        
        email_ent = await crud.create_entity(db, EntityCreate(
            investigation_id=inv.id,
            entity_type="EMAIL",
            value="john@example.com",
            metadata_json={"source": "Manual"}
        ))

        org_ent = await crud.create_entity(db, EntityCreate(
            investigation_id=inv.id,
            entity_type="ORGANIZATION",
            value="Example Corp",
            metadata_json={"source": "Manual"}
        ))

        print("3. Connecting relationships...")
        # Target domain entity ID
        target_ent = (await crud.get_entities_by_investigation(db, inv.id))[0]
        
        # Org owns Target domain
        await crud.create_relationship(db, RelationshipCreate(
            investigation_id=inv.id,
            source_id=org_ent.id,
            target_id=target_ent.id,
            relation_type="owns",
            confidence="CONFIRMED"
        ))

        # Target domain resolves to IP
        await crud.create_relationship(db, RelationshipCreate(
            investigation_id=inv.id,
            source_id=target_ent.id,
            target_id=ip_ent.id,
            relation_type="resolves_to",
            confidence="OBSERVED"
        ))

        print("4. Fetching Graph Data...")
        graph = await crud.get_graph_data(db, inv.id)
        print(f"Graph success! Nodes count: {len(graph.nodes)}, Edges count: {len(graph.edges)}")
        for n in graph.nodes:
            print(f" - Node [{n.data['entity_type']}]: {n.data['label']} at pos ({n.position['x']:.1f}, {n.position['y']:.1f})")
        for e in graph.edges:
            print(f" - Edge: {e.source} --({e.label})--> {e.target}")

if __name__ == "__main__":
    asyncio.run(test())
