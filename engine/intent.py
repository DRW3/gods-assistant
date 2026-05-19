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


async def route_intent(ws, text: str, config: dict, voice_input: bool = False, effort: str = "auto", session=None) -> None:
    """Route command to Groq (fast chat) or Claude Code (tools needed).
    effort: "auto"|"balanced" → classify first, "fast" → always Groq, "max" → always Claude.
    voice_input: True if user spoke, False if user typed. Controls TTS behavior."""
    global _affirm_index
    t0 = time.time()

    if session:
        session.status = "running"
        # Auto-rename generic sessions to match the command
        if session.name.startswith("Session "):
            session.name = text[:20].strip()

    # Determine routing based on effort level
    use_claude = False

    if effort == "max":
        use_claude = True
    elif effort == "fast":
        use_claude = False
    else:
        # Auto/balanced: classify with Groq 8B
        try:
            from llm import classify_needs_tools
            api_key = config.get("groq_api_key", "")
            use_claude = classify_needs_tools(text, api_key)
        except Exception as e:
            log.error(f"Classification failed, falling back to Claude: {e}")
            use_claude = True  # fallback to claude if classification fails

    # Emit which mode we're using
    mode_label = "Claude Code" if use_claude else "Groq (fast)"
    stream_item_base = {}
    if session:
        stream_item_base["session_id"] = session.id
    await emit(ws, "stream_item", {
        **stream_item_base,
        "id": "stream_0", "event": "thinking", "title": f"{mode_label}...",
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

    if use_claude and is_claude_available():
        async def on_event(item):
            if session:
                item["session_id"] = session.id
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
    else:
        # Fast Groq response
        from llm import ask_brain
        api_key = config.get("groq_api_key", "")
        model = config.get("groq_brain_model", "llama-3.3-70b-versatile")

        loop = asyncio.get_event_loop()
        response_text = await loop.run_in_executor(None, ask_brain, text, api_key, model)

        elapsed = f"{time.time() - t0:.1f}s"
        await emit(ws, "stream_item", {
            **stream_item_base,
            "id": "stream_done", "event": "done", "title": "Done",
            "detail": f"{elapsed} · Groq", "status": "done", "elapsed": elapsed,
        })

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

    if session:
        session.status = "idle"
        session.context_summary = (response_text or "")[:60]

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
