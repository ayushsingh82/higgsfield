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
- `Generation`: id, userId, prompt, referenceImageKey?, provider, model, aspectRatio,
  durationSec, status (PENDING/IN_PROGRESS/COMPLETED/FAILED), outputKey?,
  creditsCost, createdAt, completedAt
  - `provider`+`model` (not just `model`): Hugging Face Inference Providers requires
    a provider name alongside the model id, and — critically — a different provider
    per task (see below), so both need to be persisted per generation, not just a
    single opaque model string.

## Architecture (rough)

- Single deploy unit for speed: full-stack framework (API routes + frontend in one
  app) over a split frontend/backend monorepo — less deploy surface to configure in a
  24h window.
- **Deploy target: Render** (free web service tier, always-on-during-requests Node
  process), not Vercel-style serverless functions — required by the HF sync-call
  timeout issue below. Next.js still works fine here via `next start`; only the
  hosting model changes, not the framework. (Originally targeted Railway; its free
  trial expired mid-build and now requires a paid plan, so switched to Render's free
  tier — same architecture fit, the one trade-off being free-tier idle spin-down
  after ~15min with a ~30-60s cold start on the next request. See DEPLOY.md.)
- Hosted Postgres (not self-managed) for persistence.
- Hosted S3-compatible object storage for uploads/outputs (not self-hosted MinIO — no
  time for that infra).
- Video-generation provider: **Hugging Face Inference Providers** (`HF_TOKEN`),
  replacing the earlier fal.ai plan. See tradeoffs below — this is not a drop-in swap.

## Provider decision: fal.ai → Hugging Face Inference Providers

Switched off fal.ai (real cost, account balance exhausted) to Hugging Face's routed
Inference Providers using `HF_TOKEN`. Verified live with `huggingface_hub`'s
`InferenceClient` — both calls below produced real, playable `.mp4` output, so the
core loop works. But the switch changes real product/architecture tradeoffs, not just
a config value, and they're being written down here rather than quietly absorbed:

- **Synchronous, not async-queue.** fal.ai's queue API (submit → poll → result) fit
  a `PENDING`→poll design cleanly. HF's `InferenceClient.textToVideo` /
  `imageToVideo` block on a single HTTP call until the video is done — there's no
  request_id/poll pattern. Text-to-video completed in ~16s (fine). Image-to-video
  took **~125 seconds** in testing — that will exceed most serverless API route
  timeouts (e.g. Vercel's default).
  - **Resolved**: deploy on a long-running host (Railway/Render/Fly.io) instead of
    serverless functions. `POST /api/generations` inserts the `PENDING` row and
    fires the HF call as an in-process background task (not awaited in the
    request/response cycle) on the same always-on Node process — no hard
    function-timeout ceiling, no separate job-queue service. The frontend still
    polls `GET /api/generations/[id]` exactly like the original fal.ai design; only
    what happens inside our own process changed.
- **Different provider per task.** `replicate` supports `text-to-video` but not
  `image-to-video` on HF's router (confirmed by a hard error). `wavespeed` supports
  `image-to-video` but wasn't tried for text-to-video. So the "optional reference
  image" MVP requirement means picking and storing a *different* provider+model pair
  depending on whether a reference image is present — not just branching on model id
  within one provider, like the fal.ai plan assumed.
- **Free-tier budget is real and small.** Free HF accounts get **$0.10/month** in
  Inference Providers credits; past that it's pay-as-you-go (a card on file), same
  "must pay eventually" problem as fal.ai, just moved. Two smoke-test calls today
  likely used a meaningful slice of that $0.10. This is not a credible budget for a
  judged demo with repeat generations — worth deciding now whether to add a payment
  method to the HF account rather than discovering a lockout mid-demo.
- **Output shape differs.** fal.ai returns a hosted `video.url` we could reference
  directly. HF's client returns raw video bytes — our backend must upload every
  output to our own object storage itself (was already the plan for durability, but
  now it's mandatory on every call, not optional).
- **Model quality is a real step down.** Models available here (Wan 2.2, 5B/14B open
  weights) are a different tier than fal.ai's Veo 3.1/Seedance/Kling — noticeably
  lower fidelity than what Higgsfield itself ships. Worth naming honestly in the
  eventual writeup rather than letting it look like an oversight.

Models verified working end-to-end just now:
- Text-to-video: `provider="replicate"`, `model="Wan-AI/Wan2.2-TI2V-5B"`
- Image-to-video: `provider="wavespeed"`, `model="Wan-AI/Wan2.2-I2V-A14B"`

### Update 2026-09-27: JS client verification hit the depleted-credits wall

Ran the actual JS `@huggingface/inference` call path (not just Python) to close
out the one open risk from above. Two findings:

1. **Real bug caught**: `InferenceClient`'s JS constructor does *not* accept
   `provider` as a default the way the Python client does — passing it via
   `new InferenceClient(token, { provider })` is silently ignored, and the
   client falls back to `"auto"` provider selection instead (visible in the
   client's own log line). Fixed in `src/lib/videogen.ts`: `provider` now goes
   on each call's args object (`client.textToVideo({ provider, model, ... })`),
   which is where `BaseArgs` actually defines it.
2. **Free-tier credits are now fully depleted** — the call reached HF's router
   correctly (this confirms the request shape is valid) but was rejected with
   "You have depleted your monthly included credits." This is the risk flagged
   above materializing already, sooner than expected (two Python + one JS test
   call used it up). No further live generation is possible until the monthly
   reset or a top-up. The person is aware and has decided not to add funds
   preemptively — this is a known, accepted gap, not an oversight: **the fixed
   code path is believed correct (request reached the server validly) but has
   not yet produced a completed video via the JS client** — that confirmation
   is still pending a working credit balance.
