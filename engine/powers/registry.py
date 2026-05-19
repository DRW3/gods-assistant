import importlib
import logging

log = logging.getLogger(__name__)

POWER_MODULES = {
    "app_control": "powers.app_control",
    "system": "powers.system_settings",
    "terminal": "shell",
    "complex": "claude_bridge",
}


async def execute(power: str, action: str, args: dict, config: dict) -> str:
    module_path = POWER_MODULES.get(power)
    if not module_path:
        return f"Power '{power}' is not yet implemented."

    try:
        module = importlib.import_module(module_path)
        handler = getattr(module, "handle", None)
        if handler is None:
            return f"Power '{power}' has no handler."
        return await handler(action, args, config)
    except Exception as e:
        log.error(f"Error in {power}.{action}: {e}")
        return f"Error executing {power}: {e}"
