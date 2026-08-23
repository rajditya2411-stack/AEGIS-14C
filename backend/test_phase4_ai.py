import asyncio
from app.database import init_db, AsyncSessionLocal
from app.services.ai_config import save_settings, get_public_settings, get_raw_settings
from app.services.ai_service import AIService
from app.schemas import InvestigationCreate
import app.crud as crud

async def test_phase4_ai():
    print("--- TRACE Phase 4 AI Analysis Verification ---")

    # 1. Test AI Config Persistent Store
    print("\n1. Testing AI Settings Persistent Storage...")
    initial_pub = get_public_settings()
    print(f"[OK] Initial Public Config: {initial_pub}")

    save_settings({
        "provider": "gemini",
        "gemini_api_key": "AIzaSyTestKey123456789",
        "ollama_url": "http://localhost:11434",
        "ollama_model": "llama3"
    })

    saved_pub = get_public_settings()
    print(f"[OK] Saved Public Config: {saved_pub}")
    assert saved_pub["has_gemini_key"] is True
    assert saved_pub["masked_gemini_key"] == "AIza...6789"
    assert saved_pub["is_configured"] is True

    # 2. Test Grounded Context Builder
    print("\n2. Testing Grounded Context Construction from DB...")
    await init_db()
    async with AsyncSessionLocal() as db:
        inv = await crud.create_investigation(db, InvestigationCreate(
            title="AI Grounded Test Investigation",
            target="targetcorp.com",
            type="Domain Investigation"
        ))

        context = await AIService.build_grounded_context(db, inv.id)
        print(f"[OK] Generated Grounded Context ({len(context)} chars):")
        print(context[:300] + "...")
        assert "INVESTIGATION TARGET: targetcorp.com" in context

    # 3. Test Unconfigured Handling Graceful Fallback
    print("\n3. Testing Unconfigured API Key Behavior...")
    save_settings({"provider": "gemini", "gemini_api_key": ""})
    async with AsyncSessionLocal() as db:
        res = await AIService.analyze_investigation(db, inv.id)
        print(f"[OK] Unconfigured response: {res['analysis']}")
        assert res["success"] is False
        assert res["is_configured"] is False
        assert "No Google Gemini API Key configured" in res["analysis"]

    print("\n=======================================================")
    print("ALL PHASE 4 AI BACKEND VERIFICATION CHECKS PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(test_phase4_ai())
