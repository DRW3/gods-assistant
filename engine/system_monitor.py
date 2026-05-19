import asyncio
import subprocess
import logging
import re
import os

log = logging.getLogger(__name__)


def get_cpu_percent() -> float:
    """Fast CPU usage — average of top 10 processes divided by core count."""
    try:
        ncpu = int(subprocess.run(
            ["sysctl", "-n", "hw.ncpu"],
            capture_output=True, text=True, timeout=1
        ).stdout.strip() or "1")
        out = subprocess.run(
            ["ps", "-Ao", "%cpu", "-r"],
            capture_output=True, text=True, timeout=2
        ).stdout
        values = [float(x.strip()) for x in out.strip().split("\n")[1:] if x.strip()]
        total = sum(values)
        # Normalize to 0-100% across all cores
        return round(min(total / ncpu, 100.0), 1)
    except Exception:
        return 0.0


def get_ram_gb() -> float:
    """RAM usage via vm_stat (fast, ~10ms)."""
    try:
        out = subprocess.run(["vm_stat"], capture_output=True, text=True, timeout=2).stdout
        pages_active = int(re.search(r"Pages active:\s+(\d+)", out).group(1))
        pages_wired = int(re.search(r"Pages wired down:\s+(\d+)", out).group(1))
        pages_compressed = 0
        m = re.search(r"Pages occupied by compressor:\s+(\d+)", out)
        if m:
            pages_compressed = int(m.group(1))
        used = (pages_active + pages_wired + pages_compressed) * 4096
        return round(used / (1024 ** 3), 1)
    except Exception:
        return 0.0


def get_battery_percent() -> int:
    """Battery via pmset (fast, ~20ms)."""
    try:
        out = subprocess.run(
            ["pmset", "-g", "batt"],
            capture_output=True, text=True, timeout=2
        ).stdout
        match = re.search(r"(\d+)%", out)
        if match:
            return int(match.group(1))
    except Exception:
        pass
    return -1


def get_system_stats() -> dict:
    return {
        "cpu_percent": get_cpu_percent(),
        "ram_gb": get_ram_gb(),
        "battery_percent": get_battery_percent(),
        "network": {"in_mb": 0, "out_mb": 0},
    }


async def start_system_monitor(broadcast_fn, interval: float = 5.0):
    """Background task that broadcasts system stats."""
    while True:
        try:
            loop = asyncio.get_event_loop()
            stats = await loop.run_in_executor(None, get_system_stats)
            await broadcast_fn({
                "type": "system_stats",
                "payload": stats,
            })
        except Exception as e:
            log.debug(f"System monitor error: {e}")
        await asyncio.sleep(interval)
