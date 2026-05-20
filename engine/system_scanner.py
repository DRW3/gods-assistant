import json
import subprocess
import logging
import os
from pathlib import Path
from typing import List, Dict

log = logging.getLogger(__name__)

SESSIONS_DIR = Path.home() / ".claude" / "sessions"

# Cache terminal titles to avoid repeated AppleScript calls
_title_cache: Dict[str, str] = {}


def _get_terminal_title(tty: str) -> str:
    """Get the Terminal.app window title for a given TTY."""
    if tty in _title_cache:
        return _title_cache[tty]
    try:
        # Get all terminal window names
        out = subprocess.run(
            ["osascript", "-e", 'tell application "Terminal" to get name of every window'],
            capture_output=True, text=True, timeout=3
        ).stdout.strip()
        # Match by tty number — Terminal titles usually contain the tab info
        tty_num = tty.replace("ttys", "")
        for title in out.split(", "):
            title = title.strip()
            if title:
                _title_cache[tty] = title
        # Return first match or empty
        # Since we can't directly match tty to window, return based on order
        titles = [t.strip() for t in out.split(", ") if t.strip()]
        idx = int(tty_num) if tty_num.isdigit() else -1
        if 0 <= idx < len(titles):
            return titles[idx]
    except Exception:
        pass
    return ""


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

        # Get Terminal window title for a better name
        term_title = _get_terminal_title(tty)

        has_continue = "--continue" in command

        # Window match: use the FIRST unique part of the full terminal title
        # Terminal titles look like: "✳ Research Zenalyst business — mirroir-mcp ◂ claude — 153x16"
        # We want a substring unique enough to find THIS window only
        if term_title:
            # Use everything before the dimension suffix (e.g. "— 153x16")
            parts = term_title.rsplit("—", 1)
            window_match = parts[0].strip()[:60]
            # Display name: first meaningful segment
            display_part = term_title.split("—")[0].strip().lstrip("\u2733 ").strip()
            name = display_part[:22] + ("..." if len(display_part) > 22 else "")
        else:
            window_match = f"claude" if not has_continue else "claude --continue"
            name = project_name

        if not name or name == "home":
            if has_continue:
                name = "Main (cont.)"
            else:
                name = project_name or "Session"

        sessions.append({
            "id": f"system_{pid}",
            "pid": pid,
            "tty": tty,
            "name": name,
            "window_match": window_match,  # used by AppleScript to find window
            "cwd": cwd,
            "status": status,
            "started": started,
            "session_id": session_id,
            "kind": kind,
            "is_external": True,
            "command": command.strip()[:80],
        })

    log.info(f"Found {len(sessions)} Claude sessions")
    return sessions


def read_session_context(pid: int, max_messages: int = 10) -> str:
    """Read recent conversation from a Claude session's JSONL transcript.
    Returns a text summary of the last N exchanges."""
    session_file = SESSIONS_DIR / f"{pid}.json"
    if not session_file.exists():
        return "No session data available."

    try:
        with open(session_file) as f:
            session_data = json.load(f)
    except Exception:
        return "Could not read session file."

    session_id = session_data.get("sessionId", "")
    if not session_id:
        return "No session ID found."

    # Search for the JSONL transcript across all project directories
    projects_dir = Path.home() / ".claude" / "projects"
    transcript_path = None
    for project_dir in projects_dir.iterdir():
        if project_dir.is_dir():
            candidate = project_dir / f"{session_id}.jsonl"
            if candidate.exists():
                transcript_path = candidate
                break

    if not transcript_path:
        return "No conversation transcript found."

    # Read ONLY the last 50 lines (not the entire file — can be 40MB+)
    try:
        result = subprocess.run(
            ["tail", "-50", str(transcript_path)],
            capture_output=True, text=True, timeout=3
        )
        lines = result.stdout.strip().split("\n")
    except Exception:
        return "Could not read transcript."

    exchanges = []
    for line in lines:
        try:
            entry = json.loads(line.strip())
            entry_type = entry.get("type", "")
            if entry_type == "human":
                content = entry.get("message", {}).get("content", "")
                if isinstance(content, list):
                    text = " ".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
                elif isinstance(content, str):
                    text = content
                else:
                    text = str(content)
                if text.strip():
                    exchanges.append(f"User: {text.strip()[:150]}")
            elif entry_type == "assistant":
                content = entry.get("message", {}).get("content", "")
                if isinstance(content, list):
                    text = " ".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
                elif isinstance(content, str):
                    text = content
                else:
                    text = str(content)
                if text.strip():
                    exchanges.append(f"Claude: {text.strip()[:150]}")
        except Exception:
            continue

    # Return last N exchanges
    recent = exchanges[-max_messages:]
    if not recent:
        return "Session exists but no conversation yet."
    return "\n".join(recent)


def read_last_exchange(pid: int) -> dict:
    """Read the last user prompt and Claude response from a session.
    Returns {last_prompt, last_response} — raw text, no summarization."""
    session_file = SESSIONS_DIR / f"{pid}.json"
    if not session_file.exists():
        return {"last_prompt": "", "last_response": ""}

    try:
        with open(session_file) as f:
            session_data = json.load(f)
    except Exception:
        return {"last_prompt": "", "last_response": ""}

    session_id = session_data.get("sessionId", "")
    if not session_id:
        return {"last_prompt": "", "last_response": ""}

    projects_dir = Path.home() / ".claude" / "projects"
    transcript_path = None
    for project_dir in projects_dir.iterdir():
        if project_dir.is_dir():
            candidate = project_dir / f"{session_id}.jsonl"
            if candidate.exists():
                transcript_path = candidate
                break

    if not transcript_path:
        return {"last_prompt": "", "last_response": ""}

    # Read ONLY last 30 lines — don't load the entire 40MB file
    try:
        result = subprocess.run(
            ["tail", "-200", str(transcript_path)],
            capture_output=True, text=True, timeout=3
        )
        lines = result.stdout.strip().split("\n")
    except Exception:
        return {"last_prompt": "", "last_response": ""}

    last_prompt = ""
    last_response = ""

    # Read backwards to find the last user prompt and last assistant response
    for line in reversed(lines):
        try:
            entry = json.loads(line.strip())
            entry_type = entry.get("type", "")
            content = entry.get("message", {}).get("content", "")

            if isinstance(content, list):
                text = " ".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
            elif isinstance(content, str):
                text = content
            else:
                text = str(content)

            text = text.strip()
            if not text:
                continue

            if entry_type == "assistant" and not last_response:
                last_response = text[:500]
            elif entry_type == "human" and not last_prompt:
                last_prompt = text[:200]

            if last_prompt and last_response:
                break
        except Exception:
            continue

    return {"last_prompt": last_prompt, "last_response": last_response}


async def get_system_sessions_async():
    """Run scan in executor to avoid blocking."""
    import asyncio
    return await asyncio.get_event_loop().run_in_executor(None, scan_claude_sessions)
