import asyncio
import logging
import shutil

log = logging.getLogger(__name__)


def is_claude_available() -> bool:
    return shutil.which("claude") is not None


async def ask_claude(prompt: str, timeout: int = 120) -> str:
    if not is_claude_available():
        return ""

    log.info(f"Claude bridge: {prompt[:80]}...")

    try:
        proc = await asyncio.create_subprocess_exec(
            "claude", "-p", prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return "Claude timed out."

        response = stdout.decode().strip()
        if proc.returncode != 0:
            log.error(f"Claude error: {stderr.decode()}")
            return ""

        log.info(f"Claude response: {response[:100]}...")
        return response

    except Exception as e:
        log.error(f"Claude bridge error: {e}")
        return ""


async def handle(action: str, args: dict, config: dict) -> str:
    prompt = args.get("query", args.get("command", ""))
    if not prompt:
        return "No prompt provided."

    response = await ask_claude(prompt)
    if response:
        return response

    from llm import ask_brain
    return ask_brain(prompt, config.get("groq_api_key", ""), config.get("groq_brain_model", "llama-3.3-70b-versatile"))
