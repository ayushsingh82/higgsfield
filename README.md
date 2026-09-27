# higgsfield (working title)

A from-scratch rebuild of one core loop from higgsfield.ai's Cinema Studio
(prompt/reference → AI video generation), built for the 8x take-home. Not a
1:1 clone — see `.agent-logs/` for the build process and product decisions.

## Status

Scaffold in place: Next.js app (App Router) + Prisma schema + Hugging Face
Inference Providers adapter (`src/lib/videogen.ts`). See `plan.md` for scope,
data model, and the fal.ai → Hugging Face provider tradeoffs. Auth, storage
upload, and the library/video UI are still stubs — no live end-to-end run
through the app yet, only through direct provider smoke tests (see
`.agent-logs/`).

## Stack

- Next.js (App Router), deployed to Render (free web service tier) as an
  always-on Node process rather than serverless functions — required
  because the Hugging Face video-gen call blocks synchronously and can
  take 2+ minutes. See DEPLOY.md.
- Postgres via Prisma (`prisma/schema.prisma`).
- Video generation via Hugging Face Inference Providers (`HF_TOKEN`),
  `@huggingface/inference`'s `InferenceClient`.

## Setup

```
cp .env.example .env   # fill in HF_TOKEN, DATABASE_URL, S3_*
npm install
npm run db:migrate
npm run dev
```
