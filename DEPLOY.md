# Deploy

Everything below is manual, on-purpose: account creation and clicking
through hosted-provider dashboards isn't something the agent building this
can do itself (blocked as a real-world transaction). This is the exact
sequence to follow.

## 1. Hosted Postgres (Neon or Supabase — either works, no card required)

**Neon** (neon.tech):
1. Sign up, create a project (any region).
2. Copy the connection string it gives you — use the "pooled connection"
   variant if offered. It looks like:
   `postgresql://<user>:<password>@<host>/<dbname>?sslmode=require`

**Supabase** (supabase.com) instead:
1. Sign up, create a project.
2. Project Settings → Database → Connection string → URI (use the
   "Transaction" pooler mode for a serverless-friendly connection). Same
   `postgresql://...` shape.

Either way, that string is your `DATABASE_URL`.

## 2. Hosting: Render

(Originally targeted Railway — its free trial expired and now requires a
paid plan, so switched to Render's free web service tier instead. Still
fits the architecture: Render's free web service runs as a real container
process during active requests, which is what the always-on/synchronous
HF-call design needs — see plan.md. The one real trade-off, not a bug:
**free-tier services spin down after ~15 minutes with no inbound traffic,
and the next request after that takes ~30–60s to cold-start the container
back up.** If you're demoing this, load the URL a minute or two before
recording so it's already warm — don't let the cold start happen live on
camera and get mistaken for the app being broken.)

`render.yaml` is already in the repo (a Render "Blueprint") with the build/
start commands, so Render can pick it up automatically instead of you
re-entering build settings by hand.

1. Sign up at render.com (GitHub login is easiest).
2. New → Blueprint → connect the `ayushsingh82/higgsfield` GitHub repo.
   Render reads `render.yaml` from the repo root automatically: build =
   `npm install && npm run build`, start = `npx prisma migrate deploy &&
   npm start`, plan = `free`.
3. If you instead create the service manually (New → Web Service, not
   Blueprint), set: Runtime = Node, Build Command =
   `npm install && npm run build`, Start Command =
   `npx prisma migrate deploy && npm start`, Instance Type = Free.

## 3. Object storage: any S3-compatible bucket (Backblaze B2 used here)

The bucket is **private**, not public — deliberately, not a workaround.
B2 wants either payment history or a one-time fee to allow a public
bucket; a private bucket + short-lived presigned GET URLs (already wired
in `src/lib/storage.ts`) is arguably better practice regardless (less
exposure surface), so that's the real design, not a placeholder until
something better comes along.

1. Create a bucket (B2: dashboard → Buckets → Create a Bucket). Leave it
   **Private**.
2. Create an application key scoped to that bucket (B2: App Keys → Add a
   New Application Key).
3. Note down: the S3-compatible endpoint URL (`S3_ENDPOINT`, looks like
   `https://s3.<region>.backblazeb2.com`), the key id
   (`S3_ACCESS_KEY_ID`), the application key (`S3_SECRET_ACCESS_KEY`),
   bucket name (`S3_BUCKET`), region (`S3_REGION`, e.g. `us-east-005`).
4. No public base URL / CDN needed — the app generates a fresh presigned
   URL (1 hour expiry) per object whenever one is actually needed
   (viewing a video in the library, or fetching a reference image during
   generation), not a permanent public link.

## 4. Environment variables to set in Render (Dashboard → your service → Environment)

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the Neon/Supabase connection string from step 1 |
| `HF_TOKEN` | your Hugging Face token (same one as local `.env`) |
| `AUTH_SECRET` | a new random secret for production — generate with `openssl rand -hex 32`, don't reuse the local dev one |
| `S3_ENDPOINT` | from step 3 |
| `S3_ACCESS_KEY_ID` | from step 3 |
| `S3_SECRET_ACCESS_KEY` | from step 3 |
| `S3_BUCKET` | from step 3 |
| `S3_REGION` | from step 3 (or leave unset — defaults to `auto`) |
| `NODE_ENV` | `production` (Render sets this by default, but confirm it's there) |

`FAL_KEY` doesn't need to be set in production — it's unused by the app
(fal.ai was replaced by Hugging Face; see plan.md).

Nothing in the code has a hardcoded fallback for any of these — every one
of them throws a clear error at the point of use if missing, so a
misconfigured deploy fails loudly rather than silently falling back to
something wrong. Confirmed by grep, not assumed:
`grep -rn "process.env" src` — every secret-bearing var is a bare
`process.env.X` read with no `||` fallback.

## 5. First deploy

1. Set all the variables above in Render, then trigger the first deploy
   (push to `main`, or Render's "Manual Deploy" button).
2. `render.yaml`'s start command runs `prisma migrate deploy` automatically
   before `next start` on every deploy, so the schema is applied
   automatically — no separate manual migration step needed after the first
   variables are set correctly.
3. If you ever need to run it by hand instead (e.g. to debug), from your own
   machine with `DATABASE_URL` pointed at the hosted DB:
   ```
   DATABASE_URL="<hosted connection string>" npx prisma migrate deploy
   ```

## 6. Verify

Once deployed, Render gives you a `*.onrender.com` URL (or attach a custom
domain in Render's Settings → Custom Domains). Visit it signed out, sign
up, and confirm `/studio` and `/library` load — that satisfies "works for a
signed-out visitor landing fresh" from plan.md's MVP list. If the first
load is slow (~30–60s), that's the free-tier cold start from step 2, not a
deploy problem — reload once it's warm and it'll be fast from then on
until it idles out again.

## Known gap at deploy time

Hugging Face's free-tier credits are depleted (documented in plan.md) — the
generation flow will reach `FAILED` with a real error message rather than
`COMPLETED` until that's topped up. This is expected, not a deploy bug; the
library UI treats `FAILED` as a first-class, real state for exactly this
reason.
