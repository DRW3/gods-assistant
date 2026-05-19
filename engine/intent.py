import asyncio
import json
import logging
from llm import classify_intent, ask_brain
from tts import synthesize

log = logging.getLogger(__name__)

# Cap TTS to short responses — long text takes forever to synthesize on CPU
MAX_TTS_CHARS = 120


async def route_intent(ws, text: str, config: dict) -> None:
    api_key = config.get("groq_api_key", "")
    router_model = config.get("groq_router_model", "llama-3.1-8b-instant")
    brain_model = config.get("groq_brain_model", "llama-3.3-70b-versatile")

    # Step 1: Classify intent (fast — ~50ms on Groq)
    try:
        intent = classify_intent(text, api_key, router_model)
    except Exception as e:
        log.error(f"Intent classification failed: {e}")
        intent = {"power": "complex", "confidence": 0.0}

    power = intent.get("power", "complex")
    action = intent.get("action", "")
    args = intent.get("args", {})
    confidence = intent.get("confidence", 0.0)
    response_hint = intent.get("response_hint", "")

    log.info(f"Routed: power={power}, action={action}, confidence={confidence}")

    # Step 2: Execute (LLM or power)
    if power == "complex" or confidence < 0.7:
        response_text = ask_brain(text, api_key, brain_model)
    else:
        response_text = await execute_power(power, action, args, config)
        if not response_text:
            response_text = response_hint or f"Done: {action} {power}"

    # Step 3: Send text response IMMEDIATELY (no waiting for TTS)
    await ws.send(json.dumps({
        "type": "response",
        "payload": {"text": response_text, "audio": ""},
    }))

    # Step 4: Synthesize TTS in background thread, send audio separately
    if config.get("voice_response", True) and response_text:
        tts_text = response_text[:MAX_TTS_CHARS]
        if len(response_text) > MAX_TTS_CHARS:
            # Truncate at last sentence boundary
            for i in range(MAX_TTS_CHARS, 0, -1):
                if response_text[i] in '.!?':
                    tts_text = response_text[:i + 1]
                    break

        try:
            loop = asyncio.get_event_loop()
            voice = config.get("tts_voice", "af_heart")
            audio_b64 = await loop.run_in_executor(None, synthesize, tts_text, voice)
            if audio_b64:
                await ws.send(json.dumps({
                    "type": "audio",
                    "payload": {"audio": audio_b64},
                }))
        except Exception as e:
            log.error(f"TTS failed: {e}")

    await ws.send(json.dumps({
        "type": "state",
        "payload": {"state": "idle"},
    }))


async def execute_power(power: str, action: str, args: dict, config: dict) -> str:
    try:
        from powers import registry
        return await registry.execute(power, action, args, config)
    except Exception as e:
        log.error(f"Power execution failed: {e}")
        return f"I encountered an error: {e}"
