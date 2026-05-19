import asyncio
import logging
import shutil

log = logging.getLogger(__name__)


def is_claude_available() -> bool:
    return shutil.which("claude") is not None


async def stream_claude(prompt: str, on_line=None, timeout: int = 120) -> str:
    """Run claude -p and stream output line by line.
    on_line(line) is called for each stdout line as it arrives.
    Returns the full response."""
    if not is_claude_available():
        log.error("Claude CLI not found")
        return ""

    log.info(f"Claude: {prompt[:80]}...")

    try:
        proc = await asyncio.create_subprocess_exec(
            "claude", "-p", prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        lines = []

        async def read_stream():
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                text = line.decode().rstrip()
                lines.append(text)
                if on_line and text:
                    await on_line(text)

        try:
            await asyncio.wait_for(read_stream(), timeout=timeout)
            await proc.wait()
        except asyncio.TimeoutError:
            proc.kill()
            if on_line:
                await on_line("[timed out after {}s]".format(timeout))
            return "\n".join(lines) + "\n[timed out]"

        if proc.returncode != 0:
            stderr = (await proc.stderr.read()).decode().strip()
            log.error(f"Claude error (exit {proc.returncode}): {stderr}")
            if on_line and stderr:
                await on_line(f"[error] {stderr[:200]}")

        full = "\n".join(lines)
        log.info(f"Claude done: {len(full)} chars, {len(lines)} lines")
        return full

    except Exception as e:
        log.error(f"Claude bridge error: {e}")
        return f"Error: {e}"
