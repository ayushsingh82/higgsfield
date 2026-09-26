#!/usr/bin/env python3
"""Stop hook: logs the final assistant response text to .agent-logs/.

Claude Code invokes this at the end of a turn and passes a JSON payload on
stdin containing session_id and transcript_path (path to the session's
JSONL transcript). We read that transcript, pull out only the plain-text
content of the assistant's last message for this turn (skipping thinking
blocks, tool_use/tool_result blocks), and append it as the RESPONSE entry
matching the most recent PROMPT entry.
"""
import json
import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))
from _common import append_entry, log_debug, DEFAULT_MODEL  # noqa: E402

# Stop fires essentially concurrently with the transcript's final write; a
# fresh read can land 50-100ms before that write is flushed to disk. Retry
# briefly instead of giving up on the first empty read.
RETRY_DELAYS = [0.15, 0.25, 0.4, 0.6, 1.0]  # ~2.4s total worst case


def extract_text_blocks(content):
    if isinstance(content, str):
        return [content]
    texts = []
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                t = block.get("text", "")
                if t:
                    texts.append(t)
    return texts


def last_assistant_response(transcript_path):
    """Walk the transcript backwards, collecting the trailing run of
    assistant text blocks (the final response), stopping once we hit a
    real user prompt (not a tool_result)."""
    if not transcript_path or not os.path.exists(transcript_path):
        return "", None

    lines = []
    with open(transcript_path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                lines.append(line)

    collected = []
    model_name = None

    for raw in reversed(lines):
        try:
            entry = json.loads(raw)
        except json.JSONDecodeError:
            continue

        msg = entry.get("message", entry)
        role = msg.get("role") or entry.get("role")

        if role == "user":
            content = msg.get("content")
            # A synthetic "user" entry carrying only tool_result blocks is
            # not a real prompt boundary; keep walking past it.
            if isinstance(content, list) and all(
                isinstance(b, dict) and b.get("type") == "tool_result"
                for b in content
            ):
                continue
            break

        if role == "assistant":
            if model_name is None:
                model_name = msg.get("model") or entry.get("model")
            texts = extract_text_blocks(msg.get("content"))
            if texts:
                collected = texts + collected

    return "\n\n".join(collected).strip(), model_name


def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        data = {}

    session_id = data.get("session_id", "unknown-session")
    transcript_path = data.get("transcript_path")

    response_text, model_from_transcript = last_assistant_response(transcript_path)
    attempts = 1
    for delay in RETRY_DELAYS:
        if response_text:
            break
        time.sleep(delay)
        response_text, model_from_transcript = last_assistant_response(transcript_path)
        attempts += 1

    model = (
        model_from_transcript
        or os.environ.get("CLAUDE_LOG_MODEL")
        or DEFAULT_MODEL
    )

    if response_text:
        if attempts > 1:
            log_debug(
                f"response_text recovered after {attempts} attempts "
                f"session={session_id}"
            )
        append_entry(session_id, "RESPONSE", response_text, model)
    else:
        log_debug(
            f"empty response_text after {attempts} attempts session={session_id} "
            f"transcript_path={transcript_path}"
        )


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback
        log_debug("capture_response.py FAILED:\n" + traceback.format_exc())
    sys.exit(0)
