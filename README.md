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
credits backing this are exhausted (a known, accepted tradeoff — see
`plan.md`'s provider-decision section). The pipeline itself is verified
working end to end; it just needs a funded account to actually produce a
video instead of erroring out. That's what you'll see if you try it live.

## Stack

- **Next.js** (App Router), deployed to **Render** (free web service tier)
  as an always-on Node process rather than serverless functions —
  required because the video-gen call blocks synchronously and can take
  2+ minutes.
- **Postgres** (hosted on Neon) via **Prisma**.
- **Hugging Face Inference Providers** (`@huggingface/inference`) for
  video generation — routes to different underlying providers
  (replicate/wavespeed) depending on whether a reference image is
  present.
- **Backblaze B2** (S3-compatible) for object storage, private bucket +
  presigned URLs.
- **Tailwind CSS v4** for styling.
- **Vitest** for tests.

## Local setup

```bash
cp .env.example .env   # fill in HF_TOKEN, DATABASE_URL, DIRECT_URL, AUTH_SECRET, S3_*
npm install
npm run db:migrate
npm run dev
```

`DIRECT_URL` matters if your Postgres is behind a connection pooler (e.g.
Neon's pooled connection) — see `DEPLOY.md` for why.

## Testing

```bash
npm test
```

Covers the two pieces of logic where a silent bug would be easy to ship:
atomic credit charge/refund (run against a real database, including a
concurrent-overcharge race — not mocked) and the provider-routing
decision (text-to-video vs. image-to-video).

## More context

- [`plan.md`](./plan.md) — scope decision, cut list, data model, and every
  significant tradeoff made along the way (provider switches, architecture
  changes, deploy-target changes), written down as they happened rather
  than smoothed over afterward.
- [`DEPLOY.md`](./DEPLOY.md) — exact steps to stand this up on a fresh
  Neon + Render + B2 setup, including a couple of real production
  incidents (a leaked Postgres advisory lock through a pooled connection)
  and how they were diagnosed and fixed.
- [`DEMO-NOTES.md`](./DEMO-NOTES.md) — beat sheet for the 5-minute video
  walkthrough.
- [`.agent-logs/`](./.agent-logs/) — full raw prompt/response transcripts
  from the AI coding sessions that built this, captured automatically via
  Claude Code hooks (see `CAPTURE-TEST.md` for how that's wired up). The
  process story, not just the end state.
