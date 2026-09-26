# Scope Plan — Higgsfield Rebuild (8x assignment)

## Scope call

Higgsfield is really three layers: (1) generation surfaces — Cinema Studio, Marketing
Studio, Effects, Genjutsu, 3D Jutsu, Audio, raw Image/Video/Face Swap tools; (2) asset
management — folders/library; (3) social/publishing — profiles, feed, followers, blogs.

We build **one generation surface end-to-end**, done well, plus minimal asset storage.
Cut the rest. Judges are scoring product judgment (what you chose first, what you left
out) and UX quality on a working product — not breadth.

**Core surface chosen: Cinema Studio's prompt→video loop** (references + prompt +
model/duration/aspect + credit cost + Generate → async job → output lands in a simple
library). It's the flagship, most-legible "AI video product" pattern and demonstrates
the same shared generation-bar pattern every other surface reuses — building it well
shows we understood the system, not just one screen.

Per the brief: **not a 1:1 UI copy.** Own visual identity, own copy, own layout
decisions — same underlying interaction pattern, different execution.

## Cut list (explicit, and why)

- **Marketing Studio, Effects gallery, Genjutsu, 3D Jutsu, Audio/TTS** — each is a
  variant of the same generation-bar pattern with different input slots. Building one
  well demonstrates the pattern; building all of them thins every one out.
- **Face swap, Soul/character identity consistency** — a distinct hard problem
  (reference-consistency across generations); real scope on its own, cut for v1.
- **Social/publishing layer** (profiles, followers, blogs, contests, "Publish") —
  entirely orthogonal to the generation product; cut.
- **Real payments (Razorpay/Stripe)** — cut. Seed each user with a starting credit
  balance instead of a checkout flow; decrement on generation. Judges are grading the
  generation UX, not billing integration.
- **Multiple video models** — pick one (maybe two) real providers, not the ~11 models
  Higgsfield lists. Model choice becomes a fixed pipeline choice, not a user-facing menu
  beyond maybe a simple toggle.
- **MCP server exposure, admin/enterprise/SSO** — cut, no product-judgment upside for
  this brief.

## MVP (must ship)

1. **Auth** — email/password (or magic link), minimal. Generation gated behind login,
   matching the original.
2. **Generation flow** — prompt + optional reference image + duration/aspect + visible
   credit cost → Generate. Creates a job row `PENDING`, calls a real video-gen provider,
   updates to `COMPLETED`/`FAILED`, deducts credits atomically (refund on failure).
3. **Output delivery** — poll or simple realtime update; finished video playable
   in-page.
4. **Library** — every generation lands in a simple grid (own page), most recent first.
   No folders required for v1.
5. **Credits** — starting balance seeded per user (e.g. 100), fixed cost per
   generation, blocked at 0 with a clear message (no real purchase flow).
6. **Deploy** — live URL, works for a signed-out visitor landing fresh (they can sign up
   and use it — not something only usable pre-authed as us).

## Stretch (only if MVP is solid and time remains, in this order)

1. Batch count (generate 1–4 variants per prompt)
2. A couple of named one-click presets reusing the same backend (Effects-style, without
   building the whole gallery)
3. Simple favorites/starring in the library
4. Basic read-only profile page (no feed, no followers)

## Data model (rough)

- `User`: id, email, passwordHash, credits, createdAt
- `Generation`: id, userId, prompt, referenceImageKey?, model, aspectRatio,
  durationSec, status (PENDING/IN_PROGRESS/COMPLETED/FAILED), outputKey?,
  creditsCost, createdAt, completedAt

## Architecture (rough)

- Single deploy unit for speed: full-stack framework (API routes + frontend in one
  app) over a split frontend/backend monorepo — less deploy surface to configure in a
  24h window.
- Hosted Postgres (not self-managed) for persistence.
- Hosted S3-compatible object storage for uploads/outputs (not self-hosted MinIO — no
  time for that infra).
- One real video-generation provider behind the job — needs an API key/credits. **Open
  question below.**

## Open question before we scaffold anything

Real generation needs a live video-gen API (e.g. fal.ai, Replicate, OpenRouter's video
models, Runway). Do you already have an API key / credits with one of these, or a
budget to get one today? This decides whether the core loop is a real generation
pipeline or has to fall back to a lower-fidelity stand-in — worth locking down before
we scaffold the repo.
