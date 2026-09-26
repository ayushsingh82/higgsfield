"""Shared helpers for the 8x assignment agent-capture hooks.

Both capture_prompt.py (UserPromptSubmit) and capture_response.py (Stop)
import this. Kept dependency-free (stdlib only) so it runs under any
Python 3 without a venv.
"""
import fcntl
import glob
import json
import os
import re
import subprocess
import traceback
from datetime import datetime, timezone

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOG_DIR = os.path.join(REPO_ROOT, ".agent-logs")
DEBUG_LOG = os.path.join(LOG_DIR, ".hook-debug.log")
LOCK_FILE = os.path.join(LOG_DIR, ".hook.lock")


def log_debug(msg):
    os.makedirs(LOG_DIR, exist_ok=True)
    with open(DEBUG_LOG, "a") as f:
        f.write(f"{datetime.now(timezone.utc).isoformat()} {msg}\n")

DEFAULT_MODEL = "claude-sonnet-5"
TOOL_NAME = "claude-code"


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + \
        f"{datetime.now(timezone.utc).microsecond // 1000:03d}Z"


def project_name():
    return os.path.basename(REPO_ROOT)


def author_handle():
    try:
        out = subprocess.run(
            ["git", "config", "user.name"], cwd=REPO_ROOT,
            capture_output=True, text=True, timeout=3,
        )
        name = out.stdout.strip()
        if name:
            return name
    except Exception:
        pass
    return "unknown"


def find_log_file(session_id):
    os.makedirs(LOG_DIR, exist_ok=True)
    matches = glob.glob(os.path.join(LOG_DIR, f"*_{session_id}.md"))
    return matches[0] if matches else None


def new_log_path(session_id):
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    return os.path.join(LOG_DIR, f"{ts}_{session_id}.md")


def parse_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    fm = {}
    if not m:
        return fm, text
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fm[k.strip()] = v.strip()
    return fm, text[m.end():]


def build_frontmatter(fm):
    order = [
        "session_id", "date", "author", "model", "tool", "project",
        "total_exchanges", "first_prompt_time", "last_prompt_time",
    ]
    lines = ["---"]
    for k in order:
        if k in fm:
            lines.append(f"{k}: {fm[k]}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def ensure_log_file(session_id, model):
    path = find_log_file(session_id)
    if path:
        return path
    path = new_log_path(session_id)
    ts_now = now_iso()
    fm = {
        "session_id": session_id,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "author": author_handle(),
        "model": model or DEFAULT_MODEL,
        "tool": TOOL_NAME,
        "project": project_name(),
        "total_exchanges": "0",
        "first_prompt_time": ts_now,
        "last_prompt_time": ts_now,
    }
    header = (
        build_frontmatter(fm)
        + f"\n# Session Log - {fm['date']}\n\n"
        + f"Session: `{session_id}` | Project: `{fm['project']}` | Author: `{fm['author']}`\n\n"
        + "---\n"
    )
    with open(path, "w") as f:
        f.write(header)
    return path


def count_entries(body, entry_type):
    return len(re.findall(rf"\[LOG_ENTRY type={entry_type} num=", body))


def append_entry(session_id, entry_type, text, model):
    os.makedirs(LOG_DIR, exist_ok=True)
    lock_fd = open(LOCK_FILE, "w")
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX)

        path = ensure_log_file(session_id, model)
        with open(path, "r") as f:
            content = f.read()
        fm, body = parse_frontmatter(content)

        if entry_type == "PROMPT":
            num = count_entries(body, "PROMPT") + 1
        else:
            existing_responses = count_entries(body, "RESPONSE")
            prompt_count = count_entries(body, "PROMPT")
            if existing_responses >= prompt_count:
                # Already logged a response for the latest prompt (duplicate
                # Stop firing) — skip instead of appending a stray entry.
                log_debug(
                    f"skip duplicate RESPONSE session={session_id} "
                    f"prompts={prompt_count} responses={existing_responses}"
                )
                return path
            num = prompt_count

        ts = now_iso()
        entry = (
            f"\n[LOG_ENTRY type={entry_type} num={num} session={session_id}]\n"
            f"timestamp: {ts}\n"
            f"model: {model or fm.get('model', DEFAULT_MODEL)}\n\n"
            f"{text.strip()}\n\n"
        )

        fm["last_prompt_time"] = ts
        fm["total_exchanges"] = str(num)
        fm.setdefault("model", model or DEFAULT_MODEL)

        new_content = build_frontmatter(fm) + body.rstrip("\n") + "\n" + entry
        with open(path, "w") as f:
            f.write(new_content)
        return path
    finally:
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
        lock_fd.close()
