"""Watches Claude session files for changes and broadcasts updates."""
import asyncio
import json
import logging
from pathlib import Path
from typing import Dict

log = logging.getLogger(__name__)

SESSIONS_DIR = Path.home() / ".claude" / "sessions"

# Track last known state per PID
_last_state: Dict[int, Dict] = {}  # pid -> {status, updatedAt}


def _read_session_states() -> Dict[int, Dict]:
    """Read all session JSON files and return their states."""
    states = {}
    if not SESSIONS_DIR.exists():
        return states
    for f in SESSIONS_DIR.glob("*.json"):
        try:
            pid = int(f.stem)
            with open(f) as fh:
                data = json.load(fh)
            states[pid] = {
                "pid": pid,
                "status": data.get("status", "unknown"),
                "updatedAt": data.get("updatedAt", 0),
                "sessionId": data.get("sessionId", ""),
            }
        except Exception:
            continue
    return states


async def start_session_watcher(broadcast_fn, interval: float = 3.0):
    """Background task that watches session files for status changes.
    When a session changes (user interacts directly with terminal),
    broadcasts the update so the overlay reflects it."""
    global _last_state

    # Initial read
    _last_state = await asyncio.get_event_loop().run_in_executor(None, _read_session_states)

    while True:
        await asyncio.sleep(interval)
        try:
            current = await asyncio.get_event_loop().run_in_executor(None, _read_session_states)

            changes = []
            for pid, state in current.items():
                prev = _last_state.get(pid)
                if prev is None:
                    # New session appeared
                    changes.append({"type": "new", **state})
                elif state["updatedAt"] != prev["updatedAt"] or state["status"] != prev["status"]:
                    # Session state changed (user interacted with terminal)
                    changes.append({"type": "changed", **state})

            # Check for sessions that disappeared
            for pid in list(_last_state.keys()):
                if pid not in current:
                    changes.append({"type": "closed", "pid": pid})

            _last_state = current

            if changes:
                log.info(f"Session changes detected: {len(changes)}")
                # Broadcast: rescan all sessions + send changes
                from system_scanner import scan_claude_sessions
                sessions = await asyncio.get_event_loop().run_in_executor(None, scan_claude_sessions)
                await broadcast_fn({
                    "type": "system_sessions",
                    "payload": {"sessions": sessions},
                })

                # Also broadcast individual changes for active tab auto-refresh
                for change in changes:
                    if change["type"] == "changed":
                        await broadcast_fn({
                            "type": "session_activity",
                            "payload": {
                                "pid": change["pid"],
                                "status": change["status"],
                                "session_id": change.get("sessionId", ""),
                            },
                        })

        except Exception as e:
            log.debug(f"Session watcher error: {e}")
