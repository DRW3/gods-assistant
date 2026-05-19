import json
import logging
from groq import Groq

log = logging.getLogger(__name__)

_client: Groq | None = None


def get_client(api_key: str) -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=api_key)
    return _client


def classify_intent(text: str, api_key: str, model: str = "llama-3.1-8b-instant") -> dict:
    client = get_client(api_key)

    system_prompt = """You are an intent classifier for a voice assistant called God's Assistant.
Given the user's voice command, return ONLY a JSON object with:
- "power": one of [app_control, system, files, clipboard, screen, messages, media, browser, web, terminal, workflow, memory, time, window, security, complex]
- "action": the specific action (open, close, set, get, run, search, etc.)
- "args": extracted arguments as a dict (app_name, value, query, path, etc.)
- "confidence": 0.0-1.0
- "response_hint": a short friendly response to speak back (e.g., "Opening Slack for you")

If confidence < 0.7 or the command requires multi-step reasoning, set power to "complex".
Return ONLY valid JSON, no explanation."""

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
        temperature=0.1,
        max_tokens=200,
        response_format={"type": "json_object"},
    )

    raw = resp.choices[0].message.content.strip()
    log.info(f"Intent: {raw}")
    return json.loads(raw)


def ask_brain(text: str, api_key: str, model: str = "llama-3.3-70b-versatile", history: list | None = None) -> str:
    client = get_client(api_key)

    messages = [
        {"role": "system", "content": "You are God's Assistant, a powerful AI assistant. Be concise, helpful, and speak with quiet confidence. Address the user respectfully. Keep responses under 3 sentences unless they ask for detail."},
    ]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": text})

    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.7,
        max_tokens=500,
    )

    return resp.choices[0].message.content.strip()
