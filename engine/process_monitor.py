import subprocess
import logging
import re

log = logging.getLogger(__name__)

# Single lsof call cached per poll cycle
_port_cache = {}


def _build_port_cache():
    """Single lsof call to get all listening ports (fast, ~50ms)."""
    global _port_cache
    _port_cache = {}
    try:
        out = subprocess.run(
            ["lsof", "-nP", "-iTCP", "-sTCP:LISTEN"],
            capture_output=True, text=True, timeout=3
        ).stdout
        for line in out.strip().split("\n")[1:]:
            parts = line.split()
            if len(parts) >= 9:
                pid = parts[1]
                match = re.search(r":(\d+)$", parts[8])
                if match and pid not in _port_cache:
                    _port_cache[pid] = f":{match.group(1)}"
    except Exception:
        pass


def get_processes() -> list:
    """Get notable running processes. Single ps + single lsof = fast."""
    try:
        # One lsof call for all ports
        _build_port_cache()

        out = subprocess.run(
            ["ps", "-eo", "pid,rss,comm"],
            capture_output=True, text=True, timeout=2
        ).stdout

        processes = []
        seen = set()

        interesting = {
            "slack": "Slack", "spotify": "Spotify",
            "google chrome": "Chrome", "chrome": "Chrome",
            "safari": "Safari", "firefox": "Firefox",
            "code": "VS Code", "electron": "Electron",
            "terminal": "Terminal", "iterm2": "iTerm2",
            "docker": "Docker", "figma": "Figma",
            "discord": "Discord", "zoom": "Zoom",
            "telegram": "Telegram", "whatsapp": "WhatsApp",
            "node": "node", "python": "python",
        }

        for line in out.strip().split("\n")[1:]:
            parts = line.strip().split(None, 2)
            if len(parts) < 3:
                continue

            pid, rss_kb, comm = parts[0], parts[1], parts[2]
            comm_lower = comm.lower().split("/")[-1]

            display = None
            for key, name in interesting.items():
                if key in comm_lower:
                    display = name
                    break

            if display and display not in seen:
                seen.add(display)
                try:
                    mem_mb = int(int(rss_kb) / 1024)
                except ValueError:
                    mem_mb = 0

                port = _port_cache.get(pid, "")

                status = "alive"
                if mem_mb > 1000:
                    status = "warning"

                processes.append({
                    "name": display,
                    "pid": int(pid),
                    "mem_mb": mem_mb,
                    "port": port,
                    "status": status,
                })

        processes.sort(key=lambda p: p["mem_mb"], reverse=True)
        return processes[:12]

    except Exception as e:
        log.debug(f"Process list failed: {e}")
    return []


async def get_processes_async():
    import asyncio
    return await asyncio.get_event_loop().run_in_executor(None, get_processes)
