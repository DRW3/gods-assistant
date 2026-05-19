import subprocess
import logging
import re

log = logging.getLogger(__name__)


def get_processes() -> list:
    """Get list of notable running processes with memory usage."""
    try:
        out = subprocess.run(
            ["ps", "aux"],
            capture_output=True, text=True, timeout=5
        ).stdout

        processes = []
        seen_names = set()

        # Known interesting processes
        interesting = {
            "Slack", "Spotify", "Chrome", "Google Chrome", "Safari", "Firefox",
            "Code", "Visual Studio Code", "Terminal", "iTerm2", "Docker",
            "Figma", "Discord", "Zoom", "Telegram", "WhatsApp",
            "node", "python", "ruby", "java", "go",
        }

        for line in out.strip().split("\n")[1:]:
            parts = line.split(None, 10)
            if len(parts) < 11:
                continue

            user = parts[0]
            pid = parts[1]
            mem_percent = parts[3]
            command = parts[10]

            # Extract process name
            name = command.split("/")[-1].split(" ")[0]

            # Check if interesting
            display_name = None
            for iname in interesting:
                if iname.lower() in command.lower():
                    display_name = iname
                    break

            if display_name and display_name not in seen_names:
                seen_names.add(display_name)

                # Get memory in MB
                try:
                    rss_kb = int(parts[5])
                    mem_mb = round(rss_kb / 1024, 0)
                except (ValueError, IndexError):
                    mem_mb = 0

                # Check for listening ports
                port = get_port_for_pid(pid)

                processes.append({
                    "name": display_name,
                    "pid": int(pid),
                    "mem_mb": int(mem_mb),
                    "port": port,
                    "status": "alive",
                })

        # Sort by memory descending
        processes.sort(key=lambda p: p["mem_mb"], reverse=True)
        return processes[:12]  # Cap at 12

    except Exception as e:
        log.debug(f"Process list failed: {e}")
    return []


def get_port_for_pid(pid: str) -> str:
    """Check if a PID has any listening ports."""
    try:
        out = subprocess.run(
            ["lsof", "-nP", "-iTCP", "-sTCP:LISTEN", "-p", pid],
            capture_output=True, text=True, timeout=3
        ).stdout
        for line in out.strip().split("\n")[1:]:
            match = re.search(r":(\d+)\s", line)
            if match:
                return f":{match.group(1)}"
    except Exception:
        pass
    return ""


async def get_processes_async():
    """Run process listing in executor to avoid blocking."""
    import asyncio
    return await asyncio.get_event_loop().run_in_executor(None, get_processes)
