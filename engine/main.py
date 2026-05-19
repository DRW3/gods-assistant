import asyncio
import json
import logging
import os
from pathlib import Path
from websockets.asyncio.server import serve, ServerConnection
from config import load_config
from system_monitor import start_system_monitor
from process_monitor import get_processes_async

# Load .env from project root
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

logging.basicConfig(level=logging.INFO, format="[engine] %(message)s")
log = logging.getLogger(__name__)

config = load_config()
clients = set()  # type: set


async def broadcast(message: dict) -> None:
    data = json.dumps(message)
    for client in clients.copy():
        try:
            await client.send(data)
        except Exception:
            clients.discard(client)


async def handle_message(ws: ServerConnection, raw: str) -> None:
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        log.error(f"Invalid JSON: {raw[:100]}")
        return

    msg_type = msg.get("type")
    payload = msg.get("payload", {})

    try:
        if msg_type == "audio_chunk":
            audio_b64 = payload.get("data", "")
            if not audio_b64:
                return

            await ws.send(json.dumps({
                "type": "state",
                "payload": {"state": "processing"},
            }))

            from stt import transcribe_audio
            text = transcribe_audio(audio_b64, config.get("stt_model", "large-v3-turbo"))

            await ws.send(json.dumps({
                "type": "transcript",
                "payload": {"text": text, "final": True},
            }))

            if text:
                from intent import route_intent
                await route_intent(ws, text, config, voice_input=True, effort=config.get("effort", "auto"))
            else:
                await ws.send(json.dumps({
                    "type": "state",
                    "payload": {"state": "idle"},
                }))

        elif msg_type == "text_command":
            text = payload.get("text", "")
            if text:
                from intent import route_intent
                effort = payload.get("effort", config.get("effort", "auto"))
                await route_intent(ws, text, config, voice_input=False, effort=effort)
            else:
                await ws.send(json.dumps({
                    "type": "state",
                    "payload": {"state": "idle"},
                }))

        elif msg_type == "get_processes":
            procs = await get_processes_async()
            await ws.send(json.dumps({
                "type": "processes",
                "payload": {"processes": procs},
            }))

        elif msg_type == "set_effort":
            config["effort"] = payload.get("level", "auto")
            await ws.send(json.dumps({"type": "effort_changed", "payload": {"level": config["effort"]}}))

        elif msg_type == "ping":
            await ws.send(json.dumps({"type": "pong"}))

        else:
            log.warning(f"Unknown message type: {msg_type}")

    except Exception as e:
        log.error(f"Error handling {msg_type}: {e}")
        await ws.send(json.dumps({
            "type": "state",
            "payload": {"state": "error"},
        }))


async def handler(ws: ServerConnection) -> None:
    clients.add(ws)
    log.info(f"Client connected ({len(clients)} total)")
    try:
        async for raw in ws:
            await handle_message(ws, raw)
    finally:
        clients.discard(ws)
        log.info(f"Client disconnected ({len(clients)} total)")


async def main() -> None:
    port = config["ws_port"]
    log.info(f"Starting WebSocket server on port {port}")

    # Start system monitor background task
    asyncio.create_task(start_system_monitor(broadcast, interval=3.0))

    async with serve(handler, "localhost", port):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
