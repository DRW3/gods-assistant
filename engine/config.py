import json
import os
from pathlib import Path

CONFIG_DIR = Path.home() / ".gods-assistant"
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULT_CONFIG = {
    "hotkey": "CommandOrControl+Shift+G",
    "voice_response": True,
    "tts_engine": "kokoro",
    "tts_voice": "af_heart",
    "stt_model": "large-v3-turbo",
    "groq_api_key": "",
    "groq_router_model": "llama-3.1-8b-instant",
    "groq_brain_model": "llama-3.3-70b-versatile",
    "chrome_debug_port": 9222,
    "memory_enabled": True,
    "activity_log": True,
    "ws_port": 9377,
}


def load_config() -> dict:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            user_config = json.load(f)
        config = {**DEFAULT_CONFIG, **user_config}
    else:
        config = DEFAULT_CONFIG.copy()

    # Override with env vars
    if os.environ.get("GROQ_API_KEY"):
        config["groq_api_key"] = os.environ["GROQ_API_KEY"]

    if not CONFIG_FILE.exists():
        save_config(config)

    return config


def save_config(config: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
