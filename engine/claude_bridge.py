import asyncio
import json
import logging
import shutil

log = logging.getLogger(__name__)

TOOL_MAP = {
    "Bash": "bash", "Read": "read", "Write": "write", "Edit": "edit",
    "Glob": "glob", "Grep": "grep", "WebSearch": "search", "WebFetch": "fetch",
    "Agent": "agent", "Skill": "skill", "TaskCreate": "plan", "TaskUpdate": "plan",
    "Monitor": "bash", "NotebookEdit": "edit",
}


def is_claude_available() -> bool:
    return shutil.which("claude") is not None


def _parse_event(line_data):
    """Parse a stream-json line into a stream_item event dict, or None to skip."""
    msg_type = line_data.get("type")

    if msg_type == "system" or msg_type == "rate_limit_event":
        return None  # skip system/rate events

    if msg_type == "assistant":
        message = line_data.get("message", {})
        content_blocks = message.get("content", [])
        items = []
        for block in content_blocks:
            btype = block.get("type")

            if btype == "thinking":
                thinking_text = block.get("thinking", "")
                if thinking_text and len(thinking_text) > 5:
                    items.append({
                        "event": "thinking",
                        "title": "Thinking",
                        "detail": thinking_text[:120] + ("..." if len(thinking_text) > 120 else ""),
                        "status": "done",
                    })

            elif btype == "tool_use":
                tool_name = block.get("name", "")
                tool_input = block.get("input", {})

                # Map tool name to event type
                event_type = TOOL_MAP.get(tool_name, "bash")
                if tool_name.startswith("mcp__"):
                    event_type = "mcp"

                # Build detail based on tool type
                detail = ""
                title = tool_name
                bash_output = None

                if event_type == "bash":
                    cmd = tool_input.get("command", "")
                    detail = cmd[:100]
                    title = "Bash"
                    bash_output = {"command": cmd, "stdout": "", "stderr": ""}
                elif event_type == "read":
                    detail = tool_input.get("file_path", "")
                    title = "Read"
                elif event_type == "write":
                    fp = tool_input.get("file_path", "")
                    detail = fp
                    title = "Write"
                elif event_type == "edit":
                    fp = tool_input.get("file_path", "")
                    detail = fp
                    title = "Edit"
                elif event_type == "glob":
                    detail = tool_input.get("pattern", "")
                    title = "Glob"
                elif event_type == "grep":
                    detail = tool_input.get("pattern", "")
                    title = "Grep"
                elif event_type == "search":
                    detail = tool_input.get("query", "")
                    title = "WebSearch"
                elif event_type == "fetch":
                    detail = tool_input.get("url", "")
                    title = "WebFetch"
                elif event_type == "agent":
                    detail = tool_input.get("description", tool_input.get("prompt", "")[:80])
                    title = f"Agent: {detail[:40]}"
                elif event_type == "skill":
                    skill_name = tool_input.get("skill", "")
                    detail = skill_name
                    title = "Skill"
                elif event_type == "mcp":
                    mcp_name = tool_name.replace("mcp__", "").split("__")[0]
                    detail = tool_name.split("__")[-1] if "__" in tool_name else ""
                    title = f"MCP: {mcp_name}"
                elif event_type == "plan":
                    detail = tool_input.get("subject", tool_input.get("description", ""))
                    title = "Plan"

                item = {
                    "event": event_type,
                    "title": title,
                    "detail": detail[:150],
                    "status": "running",
                }
                if bash_output:
                    item["bash_output"] = bash_output
                if event_type == "skill":
                    item["skill_name"] = tool_input.get("skill", "")
                if event_type == "agent":
                    item["agent_id"] = block.get("id", "")

                items.append(item)

            elif btype == "text":
                text = block.get("text", "")
                if text:
                    items.append({
                        "event": "text",
                        "title": "Response",
                        "detail": text[:200],
                        "status": "done",
                    })

        return items if items else None

    if msg_type == "result":
        return [{
            "event": "done",
            "title": "Done",
            "detail": f"{line_data.get('duration_ms', 0) / 1000:.1f}s · {line_data.get('num_turns', 1)} turns",
            "status": "done",
            "elapsed": f"{line_data.get('duration_ms', 0) / 1000:.1f}s",
        }]

    return None


_has_session = False  # Track if we've had at least one call (for --continue)


async def stream_claude(prompt, on_event=None, timeout=120):
    """Run claude -p with stream-json and emit parsed events.
    Uses --continue after first call to maintain conversation context.
    on_event(item_dict) is called for each parsed event.
    Returns the final result text."""
    global _has_session
    if not is_claude_available():
        log.error("Claude CLI not found")
        return ""

    log.info(f"Claude stream (continue={_has_session}): {prompt[:80]}...")

    cmd = ["claude", "-p", "--output-format", "stream-json", "--verbose"]
    if _has_session:
        cmd.append("--continue")
    cmd.append(prompt)

    try:
        import os
        home = os.path.expanduser("~")
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=home,  # Run from home dir so --continue finds previous sessions
        )

        result_text = ""
        item_counter = 0

        async def read_stream():
            nonlocal result_text, item_counter
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                raw = line.decode().strip()
                if not raw:
                    continue

                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                # Capture final result
                if data.get("type") == "result":
                    result_text = data.get("result", "")

                # Parse and emit events
                items = _parse_event(data)
                if items and on_event:
                    for item in items:
                        item_counter += 1
                        item["id"] = f"stream_{item_counter}"
                        await on_event(item)

        try:
            await asyncio.wait_for(read_stream(), timeout=timeout)
            await proc.wait()
        except asyncio.TimeoutError:
            proc.kill()
            if on_event:
                await on_event({
                    "id": "timeout", "event": "error",
                    "title": "Timeout", "detail": f"Exceeded {timeout}s",
                    "status": "error",
                })

        if proc.returncode != 0 and not result_text:
            stderr = (await proc.stderr.read()).decode().strip()
            log.error(f"Claude error (exit {proc.returncode}): {stderr[:200]}")
            if on_event:
                await on_event({
                    "id": "error", "event": "error",
                    "title": "Error", "detail": stderr[:150],
                    "status": "error",
                })

        if result_text:
            _has_session = True  # Next call will use --continue
        log.info(f"Claude stream done: {len(result_text)} chars")
        return result_text

    except Exception as e:
        log.error(f"Claude bridge error: {e}")
        return f"Error: {e}"
