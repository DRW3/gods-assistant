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


AFFIRMATIONS = ["On it.", "Got it.", "Working on that.", "Right away.", "Let me check.", "Looking into it."]
_affirm_index = 0


async def route_intent(ws, text: str, config: dict, voice_input: bool = False) -> None:
    """Pipe to Claude Code with stream-json, emit structured events.
    voice_input: True if user spoke, False if user typed. Controls TTS behavior."""
    global _affirm_index
    t0 = time.time()

    await emit(ws, "stream_item", {
        "id": "stream_0", "event": "thinking", "title": "Thinking...",
        "detail": text[:80], "status": "running",
    })

    # Voice affirmation ONLY when user spoke (not typed)
    if voice_input and config.get("voice_response", True):
        affirm = AFFIRMATIONS[_affirm_index % len(AFFIRMATIONS)]
        _affirm_index += 1
        try:
            loop = asyncio.get_event_loop()
            voice = config.get("tts_voice", "af_heart")
            audio_b64 = await loop.run_in_executor(None, synthesize, affirm, voice)
            if audio_b64:
                await emit(ws, "audio", {"audio": audio_b64})
        except Exception as e:
            log.error(f"Affirmation TTS failed: {e}")

    if not is_claude_available():
        response_text = await _groq_fallback(ws, text, config)
    else:
        async def on_event(item):
            await emit(ws, "stream_item", item)

        response_text = await stream_claude(text, on_event=on_event, timeout=120)

        elapsed = f"{time.time() - t0:.1f}s"
        if not response_text:
            await emit(ws, "stream_item", {
                "id": "no_response", "event": "error",
                "title": "No response", "detail": "Claude returned empty",
                "status": "error",
            })
            response_text = "No response from Claude."

    # Send text response immediately
    await emit(ws, "response", {"text": response_text, "audio": ""})

    # TTS — speak response ONLY for voice commands, not text
    if voice_input and config.get("voice_response", True) and response_text:
        tts_text = _truncate_for_tts(response_text)
        try:
            loop = asyncio.get_event_loop()
            voice = config.get("tts_voice", "af_heart")
            audio_b64 = await loop.run_in_executor(None, synthesize, tts_text, voice)
            if audio_b64:
                await emit(ws, "audio", {"audio": audio_b64})
        except Exception as e:
            log.error(f"TTS failed: {e}")

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
