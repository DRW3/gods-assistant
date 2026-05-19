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
    """Simple architecture: pipe everything to Claude Code.
    Claude is the brain, the terminal, the everything."""
    t0 = time.time()

    # Show what the user said
    await emit_task(ws, "claude", "Claude Code", "running", "thinking...")
    await emit_terminal(ws, f"claude -p \"{text[:70]}{'...' if len(text) > 70 else ''}\"", "cmd")

    if not is_claude_available():
        # Fallback to Groq if claude CLI not installed
        await emit_terminal(ws, "Claude CLI not found, using Groq fallback", "output", "error")
        await emit_task(ws, "claude", "Claude Code", "error", "not installed", "")
        response_text = await _groq_fallback(ws, text, config)
    else:
        # Stream Claude output line by line to the overlay
        line_count = [0]

        async def on_line(line: str):
            line_count[0] += 1
            await emit_terminal(ws, line, "output", "ok")
            # Update task with latest line
            await emit_task(ws, "claude", "Claude Code", "running",
                            f"line {line_count[0]}: {line[:40]}...",
                            f"{time.time() - t0:.1f}s")

        response_text = await stream_claude(text, on_line=on_line, timeout=120)

        elapsed = f"{time.time() - t0:.1f}s"
        if response_text:
            await emit_task(ws, "claude", "Claude Code", "done",
                            f"{len(response_text)} chars, {line_count[0]} lines", elapsed)
        else:
            await emit_task(ws, "claude", "Claude Code", "error", "no response", elapsed)
            response_text = "Claude didn't return a response."

    # Send text response immediately
    await emit(ws, "response", {"text": response_text, "audio": ""})

    # TTS summary (speak first ~120 chars)
    if config.get("voice_response", True) and response_text:
        tts_text = _truncate_for_tts(response_text)
        await emit_task(ws, "tts", "Voice summary", "running", "speaking...")
        try:
            loop = asyncio.get_event_loop()
            voice = config.get("tts_voice", "af_heart")
            audio_b64 = await loop.run_in_executor(None, synthesize, tts_text, voice)
            await emit_task(ws, "tts", "Voice summary", "done", "", "")
            if audio_b64:
                await emit(ws, "audio", {"audio": audio_b64})
        except Exception as e:
            log.error(f"TTS failed: {e}")
            await emit_task(ws, "tts", "Voice summary", "error", str(e), "")

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
