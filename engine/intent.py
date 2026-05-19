import asyncio
import json
import logging
import time
from llm import classify_intent, ask_brain, generate_command
from tts import synthesize
from shell import run_command

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
    api_key = config.get("groq_api_key", "")
    router_model = config.get("groq_router_model", "llama-3.1-8b-instant")
    brain_model = config.get("groq_brain_model", "llama-3.3-70b-versatile")

    t0 = time.time()

    # Step 1: Classify intent
    await emit_task(ws, "classify", "Classify intent", "running", "routing...")
    await emit_terminal(ws, f"classify \"{text[:60]}{'...' if len(text) > 60 else ''}\"", "cmd")

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

    # Step 2: Execute based on power type
    t1 = time.time()
    response_text = ""

    if power == "terminal" or (power == "complex" and _looks_like_command(text)):
        # Generate and execute a real shell command
        response_text = await _handle_terminal(ws, text, api_key, brain_model, config)

    elif power in ("app_control", "system") and confidence >= 0.7:
        # Direct power execution
        response_text = await _handle_power(ws, power, action, args, response_hint, config)

    else:
        # Ask the brain for a conversational response
        response_text = await _handle_brain(ws, text, api_key, brain_model)

    elapsed2 = f"{time.time() - t1:.1f}s"

    # Step 3: Send text response IMMEDIATELY
    await emit(ws, "response", {"text": response_text, "audio": ""})

    # Step 4: TTS in background
    if config.get("voice_response", True) and response_text:
        tts_text = _truncate_for_tts(response_text)
        await emit_task(ws, "tts", "Voice response", "running", "speaking...")
        try:
            loop = asyncio.get_event_loop()
            voice = config.get("tts_voice", "af_heart")
            audio_b64 = await loop.run_in_executor(None, synthesize, tts_text, voice)
            await emit_task(ws, "tts", "Voice response", "done", f"{len(tts_text)} chars", "")
            if audio_b64:
                await emit(ws, "audio", {"audio": audio_b64})
        except Exception as e:
            log.error(f"TTS failed: {e}")
            await emit_task(ws, "tts", "Voice response", "error", str(e), "")

    await emit(ws, "state", {"state": "idle"})


def _looks_like_command(text: str) -> bool:
    """Heuristic: does this look like the user wants to run something on their machine?"""
    keywords = ["access", "check", "run", "execute", "find", "show", "list", "search",
                "install", "start", "stop", "kill", "process", "port", "file", "folder",
                "directory", "terminal", "command", "script", "git", "npm", "pip",
                "docker", "brew", "skill", "mirror"]
    lower = text.lower()
    return any(k in lower for k in keywords)


async def _handle_terminal(ws, text: str, api_key: str, model: str, config: dict) -> str:
    """Generate a shell command from natural language, execute it, show output."""
    await emit_task(ws, "gen_cmd", "Generate command", "running", "translating to shell...")
    await emit_terminal(ws, f"generate-command \"{text[:50]}...\"", "cmd")

    try:
        cmd_info = generate_command(text, api_key, model)
    except Exception as e:
        log.error(f"Command generation failed: {e}")
        await emit_task(ws, "gen_cmd", "Generate command", "error", str(e), "")
        return f"Couldn't generate a command: {e}"

    command = cmd_info.get("command", "")
    explanation = cmd_info.get("explanation", "")
    needs_confirm = cmd_info.get("needs_confirmation", False)

    await emit_task(ws, "gen_cmd", "Generate command", "done", explanation, "")
    await emit_terminal(ws, f"→ {explanation}", "output", "ok")

    if not command:
        return "Couldn't determine what command to run."

    if needs_confirm:
        await emit_terminal(ws, f"⚠ Dangerous: {command}", "output", "error")
        return f"This command needs confirmation: `{command}` — {explanation}"

    # Execute the command
    await emit_task(ws, "exec", f"Run: {command[:40]}", "running", "executing...")
    await emit_terminal(ws, command, "cmd")

    result = await run_command(command)

    if result["returncode"] == 0:
        output = result["stdout"][:500] if result["stdout"] else "Done (no output)"
        await emit_task(ws, "exec", f"Run: {command[:40]}", "done", "exit 0", "")
        # Show output lines
        for line in output.split("\n")[:10]:
            if line.strip():
                await emit_terminal(ws, line, "output", "ok")
        return output
    else:
        error = result["stderr"][:300] if result["stderr"] else f"Exit code {result['returncode']}"
        await emit_task(ws, "exec", f"Run: {command[:40]}", "error", f"exit {result['returncode']}", "")
        await emit_terminal(ws, error, "output", "error")
        return f"Command failed: {error}"


async def _handle_power(ws, power: str, action: str, args: dict, hint: str, config: dict) -> str:
    """Execute a direct power (app_control, system, etc.)."""
    task_label = f"{power}: {action}"
    await emit_task(ws, "execute", task_label, "running", hint or "executing...")

    if power == "app_control":
        await emit_terminal(ws, f"osascript → {action} \"{args.get('app_name', args.get('target', ''))}\"", "cmd")
    elif power == "system":
        await emit_terminal(ws, f"system → {action} {args.get('value', '')}", "cmd")
    else:
        await emit_terminal(ws, f"{power} → {action}", "cmd")

    try:
        from powers import registry
        response_text = await registry.execute(power, action, args, config)
    except Exception as e:
        log.error(f"Power failed: {e}")
        response_text = f"Error: {e}"
        await emit_task(ws, "execute", task_label, "error", str(e), "")
        await emit_terminal(ws, str(e), "output", "error")
        return response_text

    if not response_text:
        response_text = hint or f"Done: {action}"

    await emit_task(ws, "execute", task_label, "done", response_text[:50], "")
    await emit_terminal(ws, f"→ {response_text}", "output", "ok")
    return response_text


async def _handle_brain(ws, text: str, api_key: str, model: str) -> str:
    """Ask the LLM brain for a conversational response."""
    await emit_task(ws, "brain", "Thinking (Groq 70B)", "running", "reasoning...")
    await emit_terminal(ws, f"groq-70b \"{text[:50]}...\"", "cmd")

    response_text = ask_brain(text, api_key, model)

    await emit_task(ws, "brain", "Thinking (Groq 70B)", "done", f"{len(response_text)} chars", "")
    await emit_terminal(ws, f"→ {response_text[:80]}{'...' if len(response_text) > 80 else ''}", "output", "ok")
    return response_text


def _truncate_for_tts(text: str) -> str:
    if len(text) <= MAX_TTS_CHARS:
        return text
    for i in range(MAX_TTS_CHARS, 0, -1):
        if text[i] in '.!?':
            return text[:i + 1]
    return text[:MAX_TTS_CHARS]
