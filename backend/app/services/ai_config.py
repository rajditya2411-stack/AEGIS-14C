import os
import json
from typing import Dict, Any, Optional

SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ai_settings.json")

DEFAULT_SETTINGS = {
    "provider": "gemini",
    "gemini_api_key": "",
    "ollama_url": "http://localhost:11434",
    "ollama_model": "llama3",
    "apify_api_token": "",
    "twitter_bearer_token": "",
    "instagram_access_token": "",
    "hibp_api_key": ""
}

def load_settings() -> Dict[str, Any]:
    if not os.path.exists(SETTINGS_FILE):
        return DEFAULT_SETTINGS.copy()
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            merged = DEFAULT_SETTINGS.copy()
            merged.update(data)
            return merged
    except Exception:
        return DEFAULT_SETTINGS.copy()

def _mask(token: str) -> str:
    if not token:
        return ""
    return token[:4] + "..." + token[-4:] if len(token) >= 8 else "****"

def save_settings(new_settings: Dict[str, Any]) -> Dict[str, Any]:
    current = load_settings()
    
    # AI settings
    if "provider" in new_settings:
        current["provider"] = new_settings["provider"]
    if "gemini_api_key" in new_settings:
        current["gemini_api_key"] = new_settings["gemini_api_key"].strip()
    if "ollama_url" in new_settings:
        current["ollama_url"] = new_settings["ollama_url"].strip()
    if "ollama_model" in new_settings:
        current["ollama_model"] = new_settings["ollama_model"].strip()

    # Social & Threat Intel Keys
    if "apify_api_token" in new_settings:
        current["apify_api_token"] = new_settings["apify_api_token"].strip()
    if "twitter_bearer_token" in new_settings:
        current["twitter_bearer_token"] = new_settings["twitter_bearer_token"].strip()
    if "instagram_access_token" in new_settings:
        current["instagram_access_token"] = new_settings["instagram_access_token"].strip()
    if "hibp_api_key" in new_settings:
        current["hibp_api_key"] = new_settings["hibp_api_key"].strip()

    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
    except Exception as e:
        print(f"Error saving settings: {e}")

    return get_public_settings()

def get_public_settings() -> Dict[str, Any]:
    current = load_settings()
    gemini_key = current.get("gemini_api_key", "")
    apify_key = current.get("apify_api_token", "")
    twitter_key = current.get("twitter_bearer_token", "")
    insta_key = current.get("instagram_access_token", "")
    hibp_key = current.get("hibp_api_key", "")

    return {
        "provider": current.get("provider", "gemini"),
        "has_gemini_key": bool(gemini_key),
        "masked_gemini_key": _mask(gemini_key),
        "ollama_url": current.get("ollama_url", "http://localhost:11434"),
        "ollama_model": current.get("ollama_model", "llama3"),
        "is_configured": bool(gemini_key if current.get("provider") == "gemini" else current.get("ollama_url")),
        
        # Social & Threat Intel API Status
        "has_apify_token": bool(apify_key),
        "masked_apify_token": _mask(apify_key),
        "has_twitter_token": bool(twitter_key),
        "masked_twitter_token": _mask(twitter_key),
        "has_instagram_token": bool(insta_key),
        "masked_instagram_token": _mask(insta_key),
        "has_hibp_key": bool(hibp_key),
        "masked_hibp_key": _mask(hibp_key)
    }

def get_raw_settings() -> Dict[str, Any]:
    return load_settings()
