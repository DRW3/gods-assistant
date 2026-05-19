import subprocess
import logging

log = logging.getLogger(__name__)


def run_osascript(script: str) -> str:
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True, text=True, timeout=10,
    )
    return result.stdout.strip()


def run_shell(cmd: str) -> str:
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=10,
    )
    return result.stdout.strip()


async def handle(action: str, args: dict, config: dict) -> str:
    value = args.get("value", "")

    if action == "volume":
        level = int(value) if value else 50
        run_osascript(f"set volume output volume {level}")
        return f"Volume set to {level}%."

    elif action == "mute":
        run_osascript("set volume output muted true")
        return "Muted."

    elif action == "unmute":
        run_osascript("set volume output muted false")
        return "Unmuted."

    elif action == "brightness":
        direction = args.get("direction", "")
        if direction == "up":
            run_shell("brightness 0.8")
        elif direction == "down":
            run_shell("brightness 0.4")
        else:
            run_shell(f"brightness {int(value)/100}" if value else "brightness 0.5")
        return "Brightness adjusted."

    elif action in ("dnd", "do_not_disturb"):
        on = value if isinstance(value, bool) else str(value).lower() in ("true", "on", "1")
        if on:
            run_shell('shortcuts run "DND On" 2>/dev/null || defaults -currentHost write com.apple.notificationcenterui doNotDisturb -bool true && killall NotificationCenter 2>/dev/null')
            return "Do Not Disturb is on."
        else:
            run_shell('shortcuts run "DND Off" 2>/dev/null || defaults -currentHost write com.apple.notificationcenterui doNotDisturb -bool false && killall NotificationCenter 2>/dev/null')
            return "Do Not Disturb is off."

    elif action == "dark_mode":
        run_osascript('tell application "System Events" to tell appearance preferences to set dark mode to true')
        return "Dark mode enabled."

    elif action == "light_mode":
        run_osascript('tell application "System Events" to tell appearance preferences to set dark mode to false')
        return "Light mode enabled."

    elif action == "screenshot":
        run_shell("screencapture -x ~/Desktop/screenshot_$(date +%s).png")
        return "Screenshot saved to Desktop."

    elif action == "lock":
        run_shell("pmset displaysleepnow")
        return "Screen locked."

    elif action == "battery":
        output = run_shell("pmset -g batt | grep -o '[0-9]*%'")
        return f"Battery is at {output}."

    elif action == "sleep":
        run_shell("pmset sleepnow")
        return "Going to sleep."

    elif action == "empty_trash":
        run_osascript('tell application "Finder" to empty trash')
        return "Trash emptied."

    elif action == "wifi_toggle":
        current = run_shell("networksetup -getairportpower en0 | grep -o 'On\\|Off'")
        new_state = "off" if current == "On" else "on"
        run_shell(f"networksetup -setairportpower en0 {new_state}")
        return f"Wi-Fi turned {new_state}."

    else:
        return f"Unknown system action: {action}"
