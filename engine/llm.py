import json
import logging
from typing import Optional
from groq import Groq

log = logging.getLogger(__name__)

_client: Optional[Groq] = None


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


def ask_brain(text: str, api_key: str, model: str = "llama-3.3-70b-versatile", history: Optional[list] = None) -> str:
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


def generate_command(text: str, api_key: str, model: str = "llama-3.3-70b-versatile") -> dict:
    """Translate a natural language request into an executable shell command.
    Returns {"command": "...", "explanation": "...", "needs_confirmation": false}"""
    client = get_client(api_key)

    system_prompt = """You are a macOS terminal command generator for a voice assistant called God's Assistant.
Given a user's natural language request, generate the exact shell command(s) to execute on macOS.

Return ONLY a JSON object with:
- "command": the exact shell command to run (use && to chain multiple commands)
- "explanation": one short sentence explaining what it does
- "needs_confirmation": true if the command is destructive (rm, kill, etc.)
- "use_claude": true if this task is too complex for a single command and needs Claude Code AI

Rules:
- Use macOS commands: osascript, open, defaults, pmset, screencapture, mdfind, pbcopy, pbpaste, etc.
- For checking if something exists: ls, which, find, mdfind
- For app control: osascript -e 'tell application "AppName" to activate'
- For system info: sw_vers, sysctl, df -h, ps aux, lsof
- For file/folder search: find ~ -name "pattern" -maxdepth 4 OR mdfind "query"
- Keep commands safe and non-destructive by default

IMPORTANT context about this user's system:
- Claude Code CLI is installed at: claude (use `claude -p "prompt"` for AI tasks)
- Claude Code skills directory: ~/.claude/skills/ (contains skill folders like iphone-mirroring, website-qa)
- User's home: /Users/abhishekverma
- Projects are in: ~/Documents/ and ~/gods-assistant/
- Python venvs use: python3 / pip / uv
- Node projects use: npm / npx
- iPhone mirroring skill is at: ~/.claude/skills/iphone-mirroring/SKILL.md
- The user has Groq API key, Gemini API key in various .env files

If the user asks to "access" or "check" something, generate a command that LISTS or READS the relevant files.
If the request needs multi-step AI reasoning, set "use_claude": true and put the full request in "command".

Return ONLY valid JSON, no explanation outside the JSON."""

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
        temperature=0.1,
        max_tokens=300,
        response_format={"type": "json_object"},
    )

    raw = resp.choices[0].message.content.strip()
    log.info(f"Generated command: {raw}")
    return json.loads(raw)
