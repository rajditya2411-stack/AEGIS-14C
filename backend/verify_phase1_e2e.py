import httpx

API_BASE = "http://127.0.0.1:8000/api/v1"

def run_e2e_verification():
    print("--- TRACE Phase 1 End-to-End Verification ---")

    # 1. Healthcheck
    res = httpx.get("http://127.0.0.1:8000/health")
    assert res.status_code == 200, "Backend healthcheck failed"
    print("[OK] Backend API online")

    # 2. Create Investigation Case
    res = httpx.post(f"{API_BASE}/investigations", json={
        "title": "Op: Dark_Phoenix",
        "target": "example.com",
        "type": "Domain Investigation"
    })
    assert res.status_code == 201
    case = res.json()
    case_id = case["id"]
    print(f"[OK] Case created: '{case['title']}' (ID: {case_id})")

    # 3. Add Entity Nodes
    ip_res = httpx.post(f"{API_BASE}/entities", json={
        "investigation_id": case_id,
        "entity_type": "IP ADDRESS",
        "value": "192.0.2.10"
    })
    subdom_res = httpx.post(f"{API_BASE}/entities", json={
        "investigation_id": case_id,
        "entity_type": "DOMAIN",
        "value": "api.example.com"
    })
    person_res = httpx.post(f"{API_BASE}/entities", json={
        "investigation_id": case_id,
        "entity_type": "PERSON",
        "value": "John Doe"
    })
    org_res = httpx.post(f"{API_BASE}/entities", json={
        "investigation_id": case_id,
        "entity_type": "ORGANIZATION",
        "value": "Example Corp"
    })
    
    assert ip_res.status_code == 201
    assert subdom_res.status_code == 201
    assert person_res.status_code == 201
    assert org_res.status_code == 201
    print("[OK] Created 4 new entities (IP, Subdomain, Person, Org)")

    # 4. Fetch All Entities
    ents = httpx.get(f"{API_BASE}/investigations/{case_id}/entities").json()
    assert len(ents) == 5, f"Expected 5 entities (including initial target), got {len(ents)}"
    print(f"[OK] Total entities in case: {len(ents)}")

    target_ent = [e for e in ents if e["value"] == "example.com"][0]
    ip_ent = [e for e in ents if e["value"] == "192.0.2.10"][0]
    subdom_ent = [e for e in ents if e["value"] == "api.example.com"][0]
    person_ent = [e for e in ents if e["value"] == "John Doe"][0]
    org_ent = [e for e in ents if e["value"] == "Example Corp"][0]

    # 5. Connect Relationships
    httpx.post(f"{API_BASE}/relationships", json={
        "investigation_id": case_id,
        "source_id": org_ent["id"],
        "target_id": target_ent["id"],
        "relation_type": "owns",
        "confidence": "CONFIRMED"
    })
    httpx.post(f"{API_BASE}/relationships", json={
        "investigation_id": case_id,
        "source_id": subdom_ent["id"],
        "target_id": target_ent["id"],
        "relation_type": "subdomain_of",
        "confidence": "OBSERVED"
    })
    httpx.post(f"{API_BASE}/relationships", json={
        "investigation_id": case_id,
        "source_id": target_ent["id"],
        "target_id": ip_ent["id"],
        "relation_type": "resolves_to",
        "confidence": "OBSERVED"
    })
    httpx.post(f"{API_BASE}/relationships", json={
        "investigation_id": case_id,
        "source_id": person_ent["id"],
        "target_id": subdom_ent["id"],
        "relation_type": "administers",
        "confidence": "INFERRED"
    })
    print("[OK] Created 4 connecting relationship edges")

    # 6. Create Notes
    note_res = httpx.post(f"{API_BASE}/notes", json={
        "investigation_id": case_id,
        "title": "Initial OSINT Observations",
        "content": "Target example.com owns api.example.com, administered by John Doe."
    })
    assert note_res.status_code == 201
    print("[OK] Created investigation note")

    # 7. Fetch Graph Canvas Data
    graph = httpx.get(f"{API_BASE}/investigations/{case_id}/graph").json()
    assert len(graph["nodes"]) == 5, "Graph nodes count mismatch"
    assert len(graph["edges"]) == 4, "Graph edges count mismatch"
    print("[OK] Graph engine payload verified:")
    for n in graph["nodes"]:
        print(f"   Node [{n['data']['entity_type']}]: {n['data']['label']} (x={n['position']['x']:.1f}, y={n['position']['y']:.1f})")
    for e in graph["edges"]:
        print(f"   Edge: {e['source']} --({e['label']})--> {e['target']}")

    print("\nALL PHASE 1 E2E VERIFICATION CHECKS PASSED!")

if __name__ == "__main__":
    run_e2e_verification()
