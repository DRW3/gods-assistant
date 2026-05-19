import asyncio
import json
import logging
import time
from llm import classify_intent, ask_brain
from tts import synthesize

log = logging.getLogger(__name__)

MAX_TTS_CHARS = 120


async def emit(ws, msg_type: str, payload: dict) -> None:
    """Send a message to the client."""
    await ws.send(json.dumps({"type": msg_type, "payload": payload}))


async def emit_task(ws, task_id: str, name: str, status: str, detail: str = "", elapsed: str = "") -> None:
    """Emit a task update."""
    await emit(ws, "task_update", {
        "id": task_id, "name": name, "status": status, "detail": detail, "time": elapsed,
    })


async def emit_terminal(ws, text: str, line_type: str = "cmd", status: str = "") -> None:
    """Emit a terminal line."""
    await emit(ws, "terminal_line", {"type": line_type, "text": text, "status": status})


async def route_intent(ws, text: str, config: dict) -> None:
    api_key = config.get("groq_api_key", "")
    router_model = config.get("groq_router_model", "llama-3.1-8b-instant")
    brain_model = config.get("groq_brain_model", "llama-3.3-70b-versatile")

    t0 = time.time()

    # Step 1: Classify intent
    await emit_task(ws, "classify", "Classify intent", "running", "routing...")
    await emit_terminal(ws, f"intent-classify \"{text}\"", "cmd")

    try:
        intent = classify_intent(text, api_key, router_model)
    except Exception as e:
        log.error(f"Intent classification failed: {e}")
        intent = {"power": "complex", "confidence": 0.0}
        await emit_terminal(ws, f"Classification failed: {e}", "output", "error")

    power = intent.get("power", "complex")
    action = intent.get("action", "")
    args = intent.get("args", {})
    confidence = intent.get("confidence", 0.0)
    response_hint = intent.get("response_hint", "")

    elapsed = f"{time.time() - t0:.1f}s"
    log.info(f"Routed: power={power}, action={action}, confidence={confidence}")
    await emit_task(ws, "classify", "Classify intent", "done", f"{power}.{action}", elapsed)
    await emit_terminal(ws, f"→ {power}.{action} (confidence: {confidence})", "output", "ok")

    # Step 2: Execute
    t1 = time.time()

    if power == "complex" or confidence < 0.7:
        await emit_task(ws, "execute", "Ask brain (Groq 70B)", "running", "thinking...")
        await emit_terminal(ws, f"groq-brain \"{text[:60]}...\"", "cmd")
        response_text = ask_brain(text, api_key, brain_model)
        elapsed2 = f"{time.time() - t1:.1f}s"
        await emit_task(ws, "execute", "Ask brain (Groq 70B)", "done", f"{len(response_text)} chars", elapsed2)
        await emit_terminal(ws, f"→ {response_text[:80]}{'...' if len(response_text) > 80 else ''}", "output", "ok")
    else:
        task_label = f"{power}: {action}"
        await emit_task(ws, "execute", task_label, "running", response_hint or "executing...")

        # Show the actual command being run
        if power == "app_control":
            await emit_terminal(ws, f"osascript → {action} \"{args.get('app_name', args.get('target', ''))}\"", "cmd")
        elif power == "system":
            await emit_terminal(ws, f"system → {action} {args.get('value', '')}", "cmd")
        elif power == "terminal":
            await emit_terminal(ws, args.get("command", args.get("query", "")), "cmd")
        else:
            await emit_terminal(ws, f"{power} → {action}", "cmd")

        response_text = await execute_power(power, action, args, config)
        elapsed2 = f"{time.time() - t1:.1f}s"

        if not response_text:
            response_text = response_hint or f"Done: {action} {power}"

        await emit_task(ws, "execute", task_label, "done", response_text[:50], elapsed2)
        await emit_terminal(ws, f"→ {response_text[:100]}", "output", "ok")

    # Step 3: Send text response IMMEDIATELY
    await emit(ws, "response", {"text": response_text, "audio": ""})

    # Step 4: TTS in background
    if config.get("voice_response", True) and response_text:
        await emit_task(ws, "tts", "Synthesize voice", "running", "generating...")

        tts_text = response_text[:MAX_TTS_CHARS]
        if len(response_text) > MAX_TTS_CHARS:
            for i in range(MAX_TTS_CHARS, 0, -1):
                if response_text[i] in '.!?':
                    tts_text = response_text[:i + 1]
                    break

        try:
            loop = asyncio.get_event_loop()
            voice = config.get("tts_voice", "af_heart")
            audio_b64 = await loop.run_in_executor(None, synthesize, tts_text, voice)
            await emit_task(ws, "tts", "Synthesize voice", "done", f"{len(tts_text)} chars", "")
            if audio_b64:
                await emit(ws, "audio", {"audio": audio_b64})
        except Exception as e:
            log.error(f"TTS failed: {e}")
            await emit_task(ws, "tts", "Synthesize voice", "error", str(e), "")

    await emit(ws, "state", {"state": "idle"})


async def execute_power(power: str, action: str, args: dict, config: dict) -> str:
    try:
        from powers import registry
        return await registry.execute(power, action, args, config)
    except Exception as e:
        log.error(f"Power execution failed: {e}")
        return f"I encountered an error: {e}"
