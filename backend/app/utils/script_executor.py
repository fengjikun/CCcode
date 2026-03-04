import threading
import time
from typing import Any, Dict, Optional


class ScriptTimeoutError(Exception):
    pass


def execute_python_script(script: str, input_data: Optional[Dict[str, Any]] = None,
                           timeout_seconds: int = 30) -> Any:
    """Execute a Python script with timeout protection.

    Available variables in the script:
    - input: the full input_data dict
    - context: dict with timestamp
    - each key from input_data as a top-level variable
    """
    if not script or not script.strip():
        raise ValueError("Script content is empty")

    input_data = input_data or {}
    result_holder = {"result": None, "error": None}

    sandbox_globals = {
        "__builtins__": __builtins__,
        "input": input_data,
        "context": {"timestamp": int(time.time() * 1000)},
    }
    # Expose individual input keys as top-level variables
    for key, value in input_data.items():
        sandbox_globals[key] = value

    def run_script():
        try:
            exec(script, sandbox_globals)
            result_holder["result"] = sandbox_globals.get("result", None)
        except Exception as e:
            result_holder["error"] = e

    thread = threading.Thread(target=run_script, daemon=True)
    thread.start()
    thread.join(timeout=timeout_seconds)

    if thread.is_alive():
        raise ScriptTimeoutError(f"Script execution timed out after {timeout_seconds} seconds")

    if result_holder["error"]:
        raise result_holder["error"]

    return result_holder["result"]
