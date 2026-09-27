# higgsfield

A from-scratch rebuild of one core loop from [higgsfield.ai](https://higgsfield.ai)'s
Cinema Studio: prompt (plus an optional reference image) → AI video
generation. Built for an 8x take-home assignment in a 24-hour window — not
a 1:1 clone. Same underlying interaction pattern as the original, own
visual identity, own copy, own layout decisions.

**Live**: https://higgsfield-y9u7.onrender.com
_(Render's free tier spins down after ~15 min idle — the first request
after that takes 30–60s to cold-start. Not a bug.)_

## Why this scope

Higgsfield is really three products stacked together: generation surfaces
(Cinema Studio, Marketing Studio, Effects, Genjutsu, 3D Jutsu, Audio, raw
Image/Video/Face Swap tools), asset management (folders/library), and a
social/publishing layer (profiles, followers, blogs). A 24-hour build
can't do all three well, so this ships **one generation surface, done
properly**, plus minimal library/asset storage — and cuts the rest
deliberately, rather than thinning everything out. The full reasoning for
every cut (and why Cinema Studio specifically) is in [`plan.md`](./plan.md).

## What's actually working right now

- Email/password auth
- Prompt → video generation, with an optional reference image
- Credits: seeded per user, charged atomically on generation, refunded
  automatically on failure (this is unit-tested against a real concurrent
  race — see [Testing](#testing), not just asserted)
- A library that polls generations live and shows `FAILED` as a real,
  first-class state — not hidden — with the actual provider error message
- Real object storage (Backblaze B2) via short-lived presigned URLs, not a
  public bucket

**Honest current gap**: video generation resolves to `FAILED` rather than
`COMPLETED` right now, because the Hugging Face free-tier inference
credits backing this are exhausted, and topping them up was a deliberate
"no" (see `plan.md` — final, settled decision, not an oversight). The
pipeline itself is verified working end to end; it just needs a funded
account to actually produce a video instead of erroring out. That's what
you'll see if you try it live, and it's what the demo walkthrough shows on
purpose.

## Architecture

Single Next.js app (App Router), deployed as one always-on process — no
separate frontend/backend, no external job queue. How a generation request
actually flows through it:

```
┌───────────────────────────────────────────────────────────────────┐
│ Browser — GenerationForm (/studio)                                 │
│                                                                     │
│  1. optional reference image                                       │
│     ──▶ POST /api/uploads                                          │
│         (validates type/size, uploads to B2, returns a storage key)│
│                                                                     │
│  2. POST /api/generations                                          │
│     { prompt, referenceImageKey?, aspectRatio, durationSec }        │
└──────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│ POST /api/generations  (route.ts)                                   │
│                                                                     │
│  • auth check                                                       │
│  • charge credits atomically  ──▶  402 if insufficient               │
│  • INSERT Generation row, status = PENDING                          │
│  • fire runGenerationJob() WITHOUT awaiting it                      │
│  • respond 202 immediately                                          │
└──────────────────────────────┬──────────────────────────────────────┘
                                │ same Node process, keeps running
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│ runGenerationJob()                                                   │
│                                                                     │
│  status → IN_PROGRESS                                               │
│         │                                                           │
│         ├─ referenceImageKey set?                                   │
│         │     ──▶ mint presigned GET url (src/lib/storage.ts)       │
│         │     ──▶ fetch reference image bytes                       │
│         │                                                           │
│         ▼                                                           │
│  call Hugging Face Inference Providers (src/lib/videogen.ts)        │
│     text-to-video  ──▶ provider "replicate"                         │
│     image-to-video ──▶ provider "wavespeed"                         │
│     (replicate has no image-to-video support on HF's router)        │
│         │                                                           │
│    ┌────┴─────────────────────┐   ┌──────────────────────────────┐ │
│    │ success                  │   │ failure                      │ │
│    │ upload video → B2        │   │ store real provider error    │ │
│    │ status → COMPLETED       │   │ status → FAILED               │ │
│    │                          │   │ refund credits atomically     │ │
│    └──────────────────────────┘   └──────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│ Browser — LibraryGrid (/library)                                    │
│                                                                     │
│  polls GET /api/generations every 2s, renders the row's current     │
│  status: queued… → generating… → FAILED (message shown) or          │
│  COMPLETED (video player)                                            │
└───────────────────────────────────────────────────────────────────┘
```

This shape — fire-and-forget in the same process, not a separate queue —
is *why* the deploy target had to be an always-on host (Render) rather
than a serverless platform: the Hugging Face call blocks synchronously and
can take 2+ minutes for image-to-video, which a serverless function would
get killed partway through.

### Data model

Two tables (`prisma/schema.prisma`):

- **`User`** — `id`, `email`, `passwordHash`, `credits` (seeded at 100),
  `createdAt`.
- **`Generation`** — `id`, `userId`, `prompt`, `referenceImageKey?` (a B2
  storage key, not a URL — the bucket is private), `provider`/`model`
  (both stored, not just one, since HF requires both and picks differently
  per task), `aspectRatio`, `durationSec`, `status`
  (`PENDING`/`IN_PROGRESS`/`COMPLETED`/`FAILED`), `outputKey?`,
  `creditsCost`, `errorMessage?`, `createdAt`, `completedAt?`.

## External services used, and why each one

Real reasons, not re-derived after the fact — pulled forward from the
decisions as they were actually made (`plan.md`/`DEPLOY.md` have the full
detail):

- **[Hugging Face](https://huggingface.co/join)** — the video-generation
  provider. Originally fal.ai; switched after its account balance was
  exhausted mid-build and topping it up was declined (a real cost
  decision, not a technical one). HF's routed Inference Providers let
  generation keep working against a free-tier account without a separate
  per-provider signup, at the cost of a real architecture change (HF's
  call is synchronous, not an async queue like fal's) and a real quality
  step down (open-weight Wan 2.2 models vs. fal's Veo 3.1/Seedance/Kling
  tier) — documented honestly in `plan.md`, not glossed over.
- **[Neon](https://neon.tech)** — hosted Postgres. Picked for a genuinely
  free, no-card-required tier that still gives a real production-grade
  managed Postgres instance rather than something to self-host in a
  24-hour window. Its pooled connection is why `DIRECT_URL` exists at all
  (see `DEPLOY.md` for the real incident that surfaced this: a leaked
  session-level advisory lock through the pooler that broke
  `prisma migrate deploy`).
- **[Render](https://render.com)** — hosting. Originally Railway; its free
  trial expired mid-build and started requiring a paid plan, so switched
  to Render's free web service tier. Both fit the same real requirement —
  an always-on process, not serverless functions, because of how the HF
  call behaves (see Architecture above) — Render just doesn't have a card
  requirement on its free tier. The one real trade-off: free services
  spin down after ~15 min idle, with a ~30–60s cold start on the next
  request.
- **[Backblaze B2](https://www.backblaze.com/cloud-storage)** — S3-
  compatible object storage for uploaded reference images and generated
  video output. Picked over other S3-compatible options because its free
  tier doesn't require a card *and* — the real reason the bucket ended up
  private rather than public — B2 specifically wants either payment
  history or a one-time fee to allow a public bucket. Landed on presigned
  URLs instead, which is arguably better practice regardless of the fee
  (smaller exposure surface than a public bucket).

## Local setup

```bash
cp .env.example .env   # fill in HF_TOKEN, DATABASE_URL, DIRECT_URL, AUTH_SECRET, S3_*
npm install
npm run db:migrate
npm run dev
```

Every variable in `.env.example` has an inline comment saying what it's
for and, where relevant, where to get it.

## Testing

```bash
npm test
```

Covers the two pieces of logic where a silent bug would be easy to ship:
atomic credit charge/refund (run against a real database, including a
concurrent-overcharge race — not mocked) and the provider-routing
decision (text-to-video vs. image-to-video).

## More context

- [`plan.md`](./plan.md) — the scope decision, cut list, data model, and
  every significant tradeoff made along the way (provider switches,
  architecture changes, deploy-target changes, the two final "settled"
  decisions on theme and no-topup), written down as they happened rather
  than smoothed over afterward.
- [`DEPLOY.md`](./DEPLOY.md) — exact steps to stand this up on a fresh
  Neon + Render + B2 setup, including a couple of real production
  incidents (a leaked Postgres advisory lock through a pooled connection,
  a devDependency pruned out of a production install) and how they were
  diagnosed and fixed, not just the happy path.
- [`DEMO-NOTES.md`](./DEMO-NOTES.md) — timed beat sheet for the 5-minute
  video walkthrough.
- [`.agent-logs/`](./.agent-logs/) — full raw prompt/response transcripts
  from the AI coding sessions that built this, captured automatically via
  Claude Code hooks (see `CAPTURE-TEST.md` for how that's wired up). The
  process story, not just the end state.
