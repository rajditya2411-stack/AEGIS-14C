import httpx
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import Investigation, Entity, Relationship, Note
from app.services.ai_config import get_raw_settings, get_public_settings

class AIService:
    @staticmethod
    async def build_grounded_context(db: AsyncSession, investigation_id: str) -> str:
        """
        Extracts full SQLite graph topology, entities, edges, and notes for an investigation
        to construct a 100% grounded context payload.
        """
        # Fetch investigation with entities, relationships, notes
        stmt = (
            select(Investigation)
            .where(Investigation.id == investigation_id)
            .options(
                selectinload(Investigation.entities),
                selectinload(Investigation.relationships),
                selectinload(Investigation.notes)
            )
        )
        inv = (await db.execute(stmt)).scalar_one_or_none()
        if not inv:
            return "No investigation context found."

        context_lines = []
        context_lines.append(f"INVESTIGATION TARGET: {inv.target} (Title: '{inv.title}', Type: {inv.type}, Status: {inv.status})")
        context_lines.append("\n--- DISCOVERED ENTITIES ---")

        entity_val_map = {}
        for ent in inv.entities:
            entity_val_map[ent.id] = ent.value
            source = ent.metadata_json.get("source", "Collector") if ent.metadata_json else "Collector"
            context_lines.append(f"- [{ent.entity_type}] {ent.value} (Raw: {ent.raw_value}, Source: {source})")

        context_lines.append("\n--- CONNECTED RELATIONSHIPS ---")
        for rel in inv.relationships:
            src_val = entity_val_map.get(rel.source_id, rel.source_id)
            tgt_val = entity_val_map.get(rel.target_id, rel.target_id)
            conf = rel.confidence or "OBSERVED"
            context_lines.append(f"- {src_val} --[{rel.relation_type}]--> {tgt_val} (Confidence: {conf})")

        if inv.notes:
            context_lines.append("\n--- INVESTIGATION NOTES ---")
            for note in inv.notes:
                context_lines.append(f"Note '{note.title}': {note.content}")

        return "\n".join(context_lines)

    @staticmethod
    async def analyze_investigation(
        db: AsyncSession,
        investigation_id: str,
        user_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Runs grounded AI analysis against Gemini API or Ollama.
        """
        settings = get_raw_settings()
        provider = settings.get("provider", "gemini")
        gemini_key = settings.get("gemini_api_key", "").strip()
        ollama_url = settings.get("ollama_url", "http://localhost:11434").strip()
        ollama_model = settings.get("ollama_model", "llama3").strip()

        # Check configuration
        if provider == "gemini" and not gemini_key:
            return {
                "success": False,
                "is_configured": False,
                "provider": "gemini",
                "analysis": "No Google Gemini API Key configured. Please click the Settings gear icon in the top header bar to add your free Gemini API key.",
                "error": "API Key Missing"
            }
        elif provider == "ollama" and not ollama_url:
            return {
                "success": False,
                "is_configured": False,
                "provider": "ollama",
                "analysis": "No local Ollama endpoint configured. Please check your AI Settings.",
                "error": "Ollama Endpoint Missing"
            }

        # Build grounded context from database
        context_str = await AIService.build_grounded_context(db, investigation_id)

        prompt_instructions = (
            "You are TRACE AI, an expert open-source intelligence (OSINT) analyst and digital forensics assistant. "
            "Analyze the target infrastructure graph provided below and answer the user's inquiry.\n\n"
            "STRICT RULES:\n"
            "1. Base your answer STRICTLY on the investigation context provided below.\n"
            "2. Do NOT invent domains, IPs, or corporate owners not in the context.\n"
            "3. Structure your response clearly using markdown bullet points, bold headers, and actionable threat insights.\n\n"
            f"=== INVESTIGATION CONTEXT ===\n{context_str}\n===============================\n\n"
        )

        if user_query and user_query.strip():
            final_prompt = f"{prompt_instructions}USER QUESTION: {user_query.strip()}"
        else:
            final_prompt = (
                f"{prompt_instructions}"
                "TASK: Perform a comprehensive OSINT threat analysis of this target. "
                "Highlight key infrastructure nodes, corporate ownership, tracking code correlations, and potential attack vectors or exposures."
            )

        # Execute Provider Request
        if provider == "gemini":
            return await AIService._call_gemini_api(gemini_key, final_prompt)
        else:
            return await AIService._call_ollama_api(ollama_url, ollama_model, final_prompt)

    @staticmethod
    async def _call_gemini_api(api_key: str, prompt: str) -> Dict[str, Any]:
        # Try Gemini 1.5 Flash first, then 2.0 Flash / Pro as fallback
        models_to_try = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-pro"]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            last_error = ""
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                payload = {
                    "contents": [
                        {
                            "parts": [{"text": prompt}]
                        }
                    ]
                }
                try:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                text_result = parts[0]["text"]
                                return {
                                    "success": True,
                                    "is_configured": True,
                                    "provider": "gemini",
                                    "model_used": model_name,
                                    "analysis": text_result
                                }
                    else:
                        last_error = f"Gemini API returned status {resp.status_code}: {resp.text}"
                except Exception as e:
                    last_error = str(e)

            return {
                "success": False,
                "is_configured": True,
                "provider": "gemini",
                "analysis": f"Failed to connect to Google Gemini API: {last_error}",
                "error": last_error
            }

    @staticmethod
    async def _call_ollama_api(ollama_url: str, model_name: str, prompt: str) -> Dict[str, Any]:
        endpoint = f"{ollama_url.rstrip('/')}/api/generate"
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False
        }
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(endpoint, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    answer = data.get("response", "")
                    return {
                        "success": True,
                        "is_configured": True,
                        "provider": "ollama",
                        "model_used": model_name,
                        "analysis": answer
                    }
                else:
                    return {
                        "success": False,
                        "is_configured": True,
                        "provider": "ollama",
                        "analysis": f"Ollama returned HTTP {resp.status_code}: {resp.text}",
                        "error": resp.text
                    }
        except Exception as e:
            return {
                "success": False,
                "is_configured": True,
                "provider": "ollama",
                "analysis": f"Could not connect to local Ollama service at {ollama_url}. Is Ollama running?",
                "error": str(e)
            }
