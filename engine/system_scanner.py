import json
import subprocess
import logging
import os
from pathlib import Path
from typing import List, Dict

log = logging.getLogger(__name__)

SESSIONS_DIR = Path.home() / ".claude" / "sessions"


def scan_claude_sessions() -> List[Dict]:
    """Scan the system for all running Claude Code terminal sessions.
    Returns list of dicts with session info."""
    sessions = []

    # Find all claude processes (not helpers, not desktop app)
    try:
        out = subprocess.run(
            ["ps", "-eo", "pid,tty,command"],
            capture_output=True, text=True, timeout=5
        ).stdout
    except Exception as e:
        log.error(f"Failed to scan processes: {e}")
        return []

    for line in out.strip().split("\n")[1:]:
        parts = line.strip().split(None, 2)
        if len(parts) < 3:
            continue
        pid_str, tty, command = parts[0], parts[1], parts[2]

        # Only match actual claude CLI processes (not helpers, not our engine)
        cmd_base = command.strip().split("/")[-1].split(" ")[0]
        if cmd_base != "claude":
            continue
        if "Helper" in command or "Contents" in command:
            continue

        pid = int(pid_str)

        # Read session file if it exists
        session_file = SESSIONS_DIR / f"{pid}.json"
        session_data = {}
        if session_file.exists():
            try:
                with open(session_file) as f:
                    session_data = json.load(f)
            except Exception:
                pass

        # Build session info
        cwd = session_data.get("cwd", "~")
        project_name = os.path.basename(cwd) if cwd != os.path.expanduser("~") else "home"
        status = session_data.get("status", "unknown")
        started = session_data.get("procStart", "")
        session_id = session_data.get("sessionId", f"ext_{pid}")
        kind = session_data.get("kind", "interactive")

        # Determine a meaningful name
        has_continue = "--continue" in command
        name = f"{project_name}"
        if has_continue:
            name += " (continued)"

        sessions.append({
            "id": f"system_{pid}",
            "pid": pid,
            "tty": tty,
            "name": name,
            "cwd": cwd,
            "status": status,
            "started": started,
            "session_id": session_id,
            "kind": kind,
            "is_external": True,  # Not spawned by God's Assistant
            "command": command.strip()[:80],
        })

    log.info(f"Found {len(sessions)} Claude sessions")
    return sessions


async def get_system_sessions_async():
    """Run scan in executor to avoid blocking."""
    import asyncio
    return await asyncio.get_event_loop().run_in_executor(None, scan_claude_sessions)
