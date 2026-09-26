# Agent-Capture Hook Verification

## Tool and model

- Claude Code v2.1.283 (CLI), model `claude-sonnet-5` (Sonnet 5) throughout.
- No separate planner/executor split — one model for both.

## Mechanism

Claude Code hooks, configured in `.claude/settings.json`:

- `UserPromptSubmit` → `.claude/hooks/capture_prompt.py` — receives the verbatim
  prompt directly on stdin as JSON (`{"session_id", "prompt", ...}`) and appends a
  `PROMPT` entry.
- `Stop` (end of turn) → `.claude/hooks/capture_response.py` — receives
  `{"session_id", "transcript_path"}` on stdin, reads Claude Code's own JSONL
  session transcript at that path, walks it backward to pull only the plain-text
  content of the final assistant message (explicitly skipping `thinking` and
  `tool_use`/`tool_result` blocks), and appends a `RESPONSE` entry matching the
  most recent `PROMPT`.
- Shared logic (file/frontmatter handling, entry numbering, a lock file to avoid
  read-modify-write races) lives in `.claude/hooks/_common.py`.

One markdown file per session, `.agent-logs/<timestamp>_<session-id>.md`, format
exactly as specified in the assignment doc (YAML frontmatter + `[LOG_ENTRY ...]`
blocks).

## Log files the canaries landed in

- `.agent-logs/2026-09-26_23-31-33_23629896-9dc7-4a4d-bcb4-5708c6495ebb.md`
  (session 1)
- `.agent-logs/2026-09-26_23-33-37_6cca2ee0-b065-4e4b-b512-dc4b07ef2f21.md`
  (session 2, opened separately, confirming the hook isn't tied to the session
  that installed it)

## Both canary entries, raw

**Session 1** (`23629896-9dc7-4a4d-bcb4-5708c6495ebb`):

```
[LOG_ENTRY type=PROMPT num=1 session=23629896-9dc7-4a4d-bcb4-5708c6495ebb]
timestamp: 2026-09-26T18:01:33.613Z
model: claude-sonnet-5

CAPTURE TEST — 8x assignment, Ayush

[LOG_ENTRY type=RESPONSE num=1 session=23629896-9dc7-4a4d-bcb4-5708c6495ebb]
timestamp: 2026-09-26T18:02:10.212Z
model: claude-sonnet-5

The hooks are already working — my prompt "CAPTURE TEST — 8x assignment, Ayush" was captured automatically by the `UserPromptSubmit` hook into `.agent-logs/2026-09-26_23-31-33_23629896-9dc7-4a4d-bcb4-5708c6495ebb.md`, and the `Stop` hook will append this response to the same file when the turn ends. The README references a `CAPTURE-TEST.md` that doesn't exist yet, so I'll create it to document the verification.

Created `CAPTURE-TEST.md`, confirming the `UserPromptSubmit`/`Stop` hook pipeline works as the README promised — this prompt was captured live in `.agent-logs/`, and the response hook will append its match when this turn ends. Let me know when you're ready to move on to the actual Cinema Studio scaffold.
```

**Session 2** (`6cca2ee0-b065-4e4b-b512-dc4b07ef2f21`):

```
[LOG_ENTRY type=PROMPT num=1 session=6cca2ee0-b065-4e4b-b512-dc4b07ef2f21]
timestamp: 2026-09-26T18:03:37.961Z
model: claude-sonnet-5

CAPTURE TEST — 8x assignment, Ayush

[LOG_ENTRY type=RESPONSE num=1 session=6cca2ee0-b065-4e4b-b512-dc4b07ef2f21]
timestamp: 2026-09-26T18:05:47.210Z
model: claude-sonnet-5

This looks like a test message to verify your prompt/response capture hooks are working, not an actual task request. I see the repo has recent commits for wiring up Claude Code hooks for agent prompt/response capture, plus an untracked `.agent-logs/` directory.

Want me to check that the capture is working correctly (e.g., inspect `.agent-logs/`), or is there a specific task from the 8x assignment you'd like me to start on?
```

## What didn't work first

1. **Typing the canary straight into the zsh shell**, not inside a running Claude
   Code session (`zsh: command not found: CAPTURE`). Fixed by actually launching
   `claude` first, then sending the canary at its prompt, not the OS shell's.
2. **`$CLAUDE_PROJECT_DIR`-based hook commands** — the `UserPromptSubmit` hook fired
   reliably every time, but the `Stop` hook silently failed to append a response on
   most turns (2 of the first 3 real exchanges across both sessions came back with
   a `PROMPT` and no matching `RESPONSE`). Recovered the missing entries by manually
   replaying the exact same extraction function against Claude Code's own stored
   transcripts (`~/.claude/projects/.../<session>.jsonl`) — confirmed the
   extraction logic itself was correct, so the failure was in hook execution, not
   parsing. Switched both hook commands from `$CLAUDE_PROJECT_DIR`-relative to
   hardcoded absolute paths as a first hardening step.
3. **Root cause turned out to be a race, not the path**: added a debug log
   (`.agent-logs/.hook-debug.log`, since hooks must stay silent on stdout) and
   caught it directly — the assistant's final text was written to the transcript
   at `18:08:46.849Z`, but the `Stop` hook read the file and gave up at
   `18:08:46.929Z`, 80ms earlier than the flush. Fixed with a short bounded retry
   loop (up to ~2.4s across 5 backoff attempts) inside `capture_response.py`.
   Confirmed fixed live afterward — debug log shows
   `response_text recovered after 2 attempts` on a later turn, with the
   `RESPONSE` entry landing automatically, no manual replay.
4. Also added a file lock around the log-file read-modify-write (in
   `_common.py`) in case `Stop` ever fires more than once for the same turn, to
   avoid a lost-update race between two concurrent appends.

## Verified

- [x] Prompt capture (`UserPromptSubmit`) — 100% of turns, both sessions
- [x] Response capture (`Stop`) — initially unreliable (silent failures), root
      caused to a write/read race, fixed with retry + verified live afterward
- [x] Second, independent session confirms the hook isn't session-specific
- [x] Log file format matches spec (frontmatter + numbered `[LOG_ENTRY]` blocks)
- [x] No stdout/blocking output from either hook (exit 0, silent; failures go to
      `.agent-logs/.hook-debug.log`, not the console)

Logging confirmed working, including a real fix mid-verification. Proceeding to
the application scaffold only once given the go-ahead in the planning
conversation (see `recon/notes.md` and `plan.md` for the product scope this
build follows).
