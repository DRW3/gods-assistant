import asyncio
import subprocess
import logging
import re

log = logging.getLogger(__name__)


def get_cpu_percent() -> float:
    try:
        out = subprocess.run(
            ["top", "-l", "1", "-n", "0"],
            capture_output=True, text=True, timeout=5
        ).stdout
        match = re.search(r"CPU usage:\s+([\d.]+)%\s+user", out)
        if match:
            return round(float(match.group(1)), 1)
    except Exception as e:
        log.debug(f"CPU check failed: {e}")
    return 0.0


def get_ram_gb() -> float:
    try:
        import os
        # Total RAM
        total = os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
        # Used via vm_stat
        out = subprocess.run(["vm_stat"], capture_output=True, text=True, timeout=5).stdout
        pages_active = int(re.search(r"Pages active:\s+(\d+)", out).group(1))
        pages_wired = int(re.search(r"Pages wired down:\s+(\d+)", out).group(1))
        pages_compressed = 0
        m = re.search(r"Pages occupied by compressor:\s+(\d+)", out)
        if m:
            pages_compressed = int(m.group(1))
        page_size = 4096  # macOS default
        used = (pages_active + pages_wired + pages_compressed) * page_size
        return round(used / (1024 ** 3), 1)
    except Exception as e:
        log.debug(f"RAM check failed: {e}")
    return 0.0


def get_battery_percent() -> int:
    try:
        out = subprocess.run(
            ["pmset", "-g", "batt"],
            capture_output=True, text=True, timeout=5
        ).stdout
        match = re.search(r"(\d+)%", out)
        if match:
            return int(match.group(1))
    except Exception as e:
        log.debug(f"Battery check failed: {e}")
    return -1


def get_network_bytes() -> dict:
    try:
        out = subprocess.run(
            ["netstat", "-ib"],
            capture_output=True, text=True, timeout=5
        ).stdout
        total_in = 0
        total_out = 0
        for line in out.strip().split("\n")[1:]:
            parts = line.split()
            if len(parts) >= 7 and parts[0] == "en0":
                try:
                    total_in = int(parts[6])
                    total_out = int(parts[9]) if len(parts) > 9 else 0
                except (ValueError, IndexError):
                    pass
                break
        return {"in_mb": round(total_in / (1024*1024), 1), "out_mb": round(total_out / (1024*1024), 1)}
    except Exception as e:
        log.debug(f"Network check failed: {e}")
    return {"in_mb": 0, "out_mb": 0}


def get_system_stats() -> dict:
    return {
        "cpu_percent": get_cpu_percent(),
        "ram_gb": get_ram_gb(),
        "battery_percent": get_battery_percent(),
        "network": get_network_bytes(),
    }


async def start_system_monitor(broadcast_fn, interval: float = 3.0):
    """Background task that broadcasts system stats every N seconds."""
    while True:
        try:
            stats = await asyncio.get_event_loop().run_in_executor(None, get_system_stats)
            await broadcast_fn({
                "type": "system_stats",
                "payload": stats,
            })
        except Exception as e:
            log.debug(f"System monitor error: {e}")
        await asyncio.sleep(interval)
