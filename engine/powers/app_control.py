import subprocess
import logging

log = logging.getLogger(__name__)


def run_osascript(script: str) -> str:
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True, text=True, timeout=10,
    )
    if result.returncode != 0:
        log.error(f"osascript error: {result.stderr}")
    return result.stdout.strip()


async def handle(action: str, args: dict, config: dict) -> str:
    app_name = args.get("app_name", args.get("target", ""))

    if action == "open":
        run_osascript(f'tell application "{app_name}" to activate')
        return f"Opening {app_name}."

    elif action in ("close", "quit"):
        run_osascript(f'tell application "{app_name}" to quit')
        return f"Closing {app_name}."

    elif action == "switch":
        run_osascript(f'tell application "{app_name}" to activate')
        return f"Switching to {app_name}."

    elif action in ("list", "running"):
        output = run_osascript(
            'tell application "System Events" to get name of every process whose background only is false'
        )
        return f"Running apps: {output}"

    elif action == "kill_all":
        exclude = args.get("exclude", ["Terminal", "Finder"])
        exclude_str = ", ".join(f'"{e}"' for e in exclude)
        run_osascript(f'''
            tell application "System Events"
                set appList to name of every process whose background only is false
                repeat with appName in appList
                    if appName is not in {{{exclude_str}}} then
                        try
                            tell application appName to quit
                        end try
                    end if
                end repeat
            end tell
        ''')
        return "Closing all apps except " + ", ".join(exclude) + "."

    else:
        return f"Unknown app_control action: {action}"
