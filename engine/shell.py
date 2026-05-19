import logging
import asyncio

log = logging.getLogger(__name__)


async def run_command(command: str, timeout: int = 30) -> dict:
    log.info(f"Shell: {command}")

    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            executable="/bin/zsh",
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return {
                "stdout": "",
                "stderr": f"Command timed out after {timeout}s",
                "returncode": -1,
            }

        return {
            "stdout": stdout.decode().strip(),
            "stderr": stderr.decode().strip(),
            "returncode": proc.returncode,
        }

    except Exception as e:
        log.error(f"Shell error: {e}")
        return {"stdout": "", "stderr": str(e), "returncode": -1}


async def handle(action: str, args: dict, config: dict) -> str:
    command = args.get("command", args.get("query", ""))
    if not command:
        return "No command specified."

    dangerous = ["rm -rf /", "mkfs", "dd if=", ":(){:|:&};:"]
    for d in dangerous:
        if d in command:
            return f"Blocked dangerous command: {command}. Please confirm manually."

    result = await run_command(command)

    if result["returncode"] == 0:
        output = result["stdout"][:500]
        return output if output else "Command executed successfully."
    else:
        error = result["stderr"][:300]
        return f"Command failed (exit {result['returncode']}): {error}"
