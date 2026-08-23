import asyncio
from app.collectors.related_domains_collector import RelatedDomainsCollector

async def test_related():
    print("--- Testing Related Assets & Corporate Hierarchy Collector ---")
    col = RelatedDomainsCollector()
    
    # Test on google.com
    print("\n1. Querying 'google.com'...")
    res = await col.collect("google.com")
    print(f"[OK] Collector finished in {res.execution_time_ms:.1f}ms")
    print(f"     Discovered Entities: {len(res.entities)}")
    for e in res.entities:
        print(f"      - [{e.entity_type}] {e.value} (Source: {e.source})")
    print(f"     Discovered Relationships: {len(res.relationships)}")
    for r in res.relationships:
        print(f"      - {r.source_value} --({r.relation_type})--> {r.target_value}")

if __name__ == "__main__":
    asyncio.run(test_related())
