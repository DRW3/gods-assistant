import asyncio
import json
import logging
import os
from pathlib import Path
from websockets.asyncio.server import serve, ServerConnection
from config import load_config
from system_monitor import start_system_monitor
from process_monitor import get_processes_async
from session_manager import manager
from system_scanner import get_system_sessions_async

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
                if not manager.get_active():
                    manager.create_session()
                from intent import route_intent
                await route_intent(ws, text, config, voice_input=True, effort=config.get("effort", "auto"), session=manager.get_active())
            else:
                await ws.send(json.dumps({
                    "type": "state",
                    "payload": {"state": "idle"},
                }))

        elif msg_type == "text_command":
            text = payload.get("text", "")
            if text:
                if not manager.get_active():
                    manager.create_session()
                from intent import route_intent
                effort = payload.get("effort", config.get("effort", "auto"))
                await route_intent(ws, text, config, voice_input=False, effort=effort, session=manager.get_active())
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

        elif msg_type == "create_session":
            name = payload.get("name", "")
            session = manager.create_session(name)
            await ws.send(json.dumps({"type": "sessions_list", "payload": {"sessions": manager.list_sessions(), "active_id": manager.active_id}}))

        elif msg_type == "switch_session":
            sid = payload.get("session_id", "")
            manager.switch(sid)
            await ws.send(json.dumps({"type": "session_switched", "payload": {"active_id": sid}}))

        elif msg_type == "close_session":
            sid = payload.get("session_id", "")
            new_active = manager.close_session(sid)
            await ws.send(json.dumps({"type": "sessions_list", "payload": {"sessions": manager.list_sessions(), "active_id": new_active}}))

        elif msg_type == "list_sessions":
            await ws.send(json.dumps({"type": "sessions_list", "payload": {"sessions": manager.list_sessions(), "active_id": manager.active_id}}))

        elif msg_type == "scan_sessions":
            system_sessions = await get_system_sessions_async()
            await ws.send(json.dumps({
                "type": "system_sessions",
                "payload": {"sessions": system_sessions},
            }))

        elif msg_type == "get_session_context":
            pid = payload.get("pid", 0)
            if pid:
                from system_scanner import read_session_context
                context_text = await asyncio.get_event_loop().run_in_executor(None, read_session_context, pid, 8)

                # Summarize with Groq
                summary_result = {"summary": context_text[:200], "last_topic": "", "suggestion": ""}
                api_key = config.get("groq_api_key", "")
                if api_key and not context_text.startswith("No ") and not context_text.startswith("Could not"):
                    try:
                        from llm import get_client
                        client = get_client(api_key)
                        resp = client.chat.completions.create(
                            model="llama-3.1-8b-instant",
                            messages=[
                                {"role": "system", "content": "Summarize this Claude Code terminal session in 2-3 sentences. Then suggest what the user might want to do next. Format as JSON: {\"summary\": \"...\", \"last_topic\": \"...\", \"suggestion\": \"...\"}"},
                                {"role": "user", "content": context_text},
                            ],
                            temperature=0.3,
                            max_tokens=200,
                            response_format={"type": "json_object"},
                        )
                        import json as json_mod
                        summary_result = json_mod.loads(resp.choices[0].message.content.strip())
                    except Exception as e:
                        log.error(f"Context summarization failed: {e}")

                await ws.send(json.dumps({
                    "type": "session_context",
                    "payload": {"pid": pid, "session_id": payload.get("session_id", ""), **summary_result},
                }))

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
    # Auto-scan system sessions on connect
    try:
        system_sessions = await get_system_sessions_async()
        await ws.send(json.dumps({
            "type": "system_sessions",
            "payload": {"sessions": system_sessions},
        }))
    except Exception:
        pass
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
