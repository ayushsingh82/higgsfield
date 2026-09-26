# Demo notes — 5 min, camera on

Brief caps this at 5 minutes. The goal is showing product judgment, not
clicking through every screen — narrate the "why," not just the "what."
Rough timing below adds to ~4:30, leaving buffer.

## 1. What this is (0:00–0:20)

> "This is a from-scratch rebuild of one core loop from higgsfield.ai:
> Cinema Studio's prompt-to-video generation. Not a 1:1 clone — same
> interaction pattern, my own visual identity and cuts."

## 2. The cut, said out loud (0:20–1:15)

This is the part that's actually graded — say the reasoning, not just the
list. Pull straight from `plan.md`'s cut list:

> "Higgsfield is really three products stacked together: generation
> surfaces, asset management, and a social/publishing layer. A 24-hour
> build can't do all three well, so I picked **one generation surface,
> done properly** — Cinema Studio's prompt→video loop — and cut the rest
> deliberately:
> - Marketing Studio, Effects, Genjutsu, 3D Jutsu, Audio — all variants of
>   the same generation-bar pattern. Building one well proves I understood
>   the system; building all of them thins every one out.
> - Face swap / Soul identity consistency — a genuinely different hard
>   problem, real scope on its own.
> - The entire social layer — profiles, followers, publishing — orthogonal
>   to the generation product itself.
> - Real payments — seeded credits instead of a checkout flow, since the
>   ask is generation UX, not billing integration."

## 3. Live walkthrough (1:15–3:30)

1. Land signed out at `/` — show it's a real fresh visitor experience, not
   something only usable pre-authed.
2. Sign up → lands on `/studio`.
3. Fill the form: type a prompt, **mention the optional reference image
   slot** (upload one if time allows), pick aspect/duration, point at the
   visible credit cost before hitting Generate.
4. Submit → redirected to `/library` → point at the row going
   `queued… → generating…` live (polling, no manual refresh).
5. **When it resolves to FAILED, don't skip past it — that's the honest
   moment**:
   > "This fails right now because Hugging Face's free-tier inference
   > credits are exhausted — a known, accepted tradeoff, not a bug. The
   > important part is the app treats failure as a first-class state: the
   > real provider error is shown, and the credits I charged were
   > automatically refunded — not silently eaten." (Optionally show the
   > credit count in the header ticking back up.)
6. If credits *were* topped up before recording: same beat, but ends on
   the completed video playing in the library card instead.

## 4. Judgment calls worth naming (3:30–4:15)

Pick 2–3, don't read all of these verbatim:
- Switched providers from fal.ai to Hugging Face mid-build over a real
  cost decision, verified live both times rather than assuming the swap
  was safe — caught real bugs doing it (wrong SDK version, wrong input
  type) that would've shipped broken otherwise.
- Architecture had to change because Hugging Face's call is a long
  synchronous request, not fal's async queue — moved off serverless to an
  always-on host rather than bolt on a separate job queue.
- Credit charge/refund is tested against a real concurrent-request race
  (`npm test`), not just asserted in a comment — the "can't go negative"
  claim is actually backed by something.

## 5. Close (4:15–4:30)

> "If I had more time, next up the stretch list is batch generation,
> then simple presets, then favorites — in that order, because each one
> reuses this same backend rather than needing new surface area."

## Before recording

- [ ] Confirm current HF credit status — decide live whether the demo
      shows FAILED (honest, expected) or COMPLETED (if topped up)
- [ ] Confirm the deployed URL is live and not localhost (brief requires it)
- [ ] Have one example prompt typed/ready to paste, don't compose on camera
- [ ] Know the actual current credit balance/count so the number on screen
      matches what you say
