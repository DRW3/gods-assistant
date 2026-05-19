import asyncio
import json
import logging
import time
from claude_bridge import stream_claude, is_claude_available
from tts import synthesize

log = logging.getLogger(__name__)

MAX_TTS_CHARS = 120


async def emit(ws, msg_type: str, payload: dict) -> None:
    await ws.send(json.dumps({"type": msg_type, "payload": payload}))


async def emit_task(ws, task_id: str, name: str, status: str, detail: str = "", elapsed: str = "") -> None:
    await emit(ws, "task_update", {
        "id": task_id, "name": name, "status": status, "detail": detail, "time": elapsed,
    })


async def emit_terminal(ws, text: str, line_type: str = "cmd", status: str = "") -> None:
    await emit(ws, "terminal_line", {"type": line_type, "text": text, "status": status})


async def route_intent(ws, text: str, config: dict) -> None:
    """Seamless: pipe to Claude Code, stream output, done."""
    t0 = time.time()

    await emit_task(ws, "claude", "Thinking...", "running", "")

    if not is_claude_available():
        response_text = await _groq_fallback(ws, text, config)
    else:
        async def on_line(line: str):
            await emit_terminal(ws, line, "output", "ok")

        response_text = await stream_claude(text, on_line=on_line, timeout=120)

        elapsed = f"{time.time() - t0:.1f}s"
        if response_text:
            await emit_task(ws, "claude", "Done", "done", elapsed, "")
        else:
            await emit_task(ws, "claude", "No response", "error", "", "")
            response_text = "No response from Claude."

    # Send text response
    await emit(ws, "response", {"text": response_text, "audio": ""})
    await emit(ws, "state", {"state": "idle"})


async def _groq_fallback(ws, text: str, config: dict) -> str:
    """Fallback when Claude CLI is not available."""
    from llm import ask_brain
    api_key = config.get("groq_api_key", "")
    model = config.get("groq_brain_model", "llama-3.3-70b-versatile")

    await emit_task(ws, "groq", "Groq 70B (fallback)", "running", "thinking...")
    await emit_terminal(ws, f"groq-70b \"{text[:50]}...\"", "cmd")

    response = ask_brain(text, api_key, model)

    await emit_task(ws, "groq", "Groq 70B (fallback)", "done", f"{len(response)} chars", "")
    await emit_terminal(ws, f"→ {response[:80]}{'...' if len(response) > 80 else ''}", "output", "ok")
    return response


def _truncate_for_tts(text: str) -> str:
    if len(text) <= MAX_TTS_CHARS:
        return text
    for i in range(MAX_TTS_CHARS, 0, -1):
        if text[i] in '.!?\n':
            return text[:i + 1]
    return text[:MAX_TTS_CHARS]
