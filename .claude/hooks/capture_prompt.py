#!/usr/bin/env python3
"""UserPromptSubmit hook: logs the verbatim prompt to .agent-logs/.

Claude Code invokes this on every prompt submission and passes a JSON
payload on stdin containing at least: session_id, prompt, cwd.
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from _common import append_entry, log_debug, DEFAULT_MODEL  # noqa: E402


def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        data = {}

    session_id = data.get("session_id", "unknown-session")
    prompt = data.get("prompt", "")
    model = data.get("model") or os.environ.get("CLAUDE_LOG_MODEL") or DEFAULT_MODEL

    if prompt:
        append_entry(session_id, "PROMPT", prompt, model)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback
        log_debug("capture_prompt.py FAILED:\n" + traceback.format_exc())
    # Must not block the prompt; exit 0 with no stdout means "continue normally".
    sys.exit(0)
