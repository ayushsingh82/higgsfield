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

## 2. Hosting: Railway

Picked over Render/Fly for this repo specifically because the architecture
requires an **always-on process** (the Hugging Face video-gen call blocks
synchronously and can take 2+ minutes — see plan.md) plus **zero-config
Nixpacks builds** for a plain Next.js app — no Dockerfile to write or debug.
`railway.json` is already in the repo with the build/start commands.

1. Sign up at railway.app (GitHub login is easiest).
2. New Project → Deploy from GitHub repo → pick `ayushsingh82/higgsfield`.
3. Railway reads `railway.json` automatically: build = `npm run build`,
   start = `npx prisma migrate deploy && npm start` (the migration runs
   against whatever `DATABASE_URL` is set at deploy time — see below).

## 3. Object storage: any S3-compatible bucket (Cloudflare R2 recommended, no card required on the free tier)

1. Create a bucket (R2: dashboard → R2 → Create bucket).
2. Create an API token/access key scoped to that bucket (R2: "Manage R2 API
   Tokens").
3. Make the bucket's contents publicly readable — either turn on the
   provider's public bucket URL, or (recommended, more control) put a CDN /
   custom domain in front of it. That public base URL is
   `STORAGE_PUBLIC_BASE_URL`.
4. Note down: endpoint URL (`S3_ENDPOINT`), access key id
   (`S3_ACCESS_KEY_ID`), secret key (`S3_SECRET_ACCESS_KEY`), bucket name
   (`S3_BUCKET`), region (`S3_REGION` — R2 doesn't really use this, `auto`
   is fine and is already the code's default if you leave it unset).

## 4. Environment variables to set in Railway (Project → Variables)

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
| `STORAGE_PUBLIC_BASE_URL` | from step 3 |
| `NODE_ENV` | `production` (Railway sets this by default, but confirm it's there) |

`FAL_KEY` doesn't need to be set in production — it's unused by the app
(fal.ai was replaced by Hugging Face; see plan.md).

Nothing in the code has a hardcoded fallback for any of these — every one
of them throws a clear error at the point of use if missing, so a
misconfigured deploy fails loudly rather than silently falling back to
something wrong. Confirmed by grep, not assumed:
`grep -rn "process.env" src` — every secret-bearing var is a bare
`process.env.X` read with no `||` fallback.

## 5. First deploy

1. Set all the variables above in Railway, then trigger the first deploy
   (push to `main`, or Railway's "Deploy" button).
2. `railway.json`'s start command runs `prisma migrate deploy` automatically
   before `next start` on every deploy, so the schema is applied
   automatically — no separate manual migration step needed after the first
   variables are set correctly.
3. If you ever need to run it by hand instead (e.g. to debug), from your own
   machine with `DATABASE_URL` pointed at the hosted DB:
   ```
   DATABASE_URL="<hosted connection string>" npx prisma migrate deploy
   ```

## 6. Verify

Once deployed, Railway gives you a `*.up.railway.app` URL (or attach a
custom domain in Railway's Settings → Domains). Visit it signed out, sign
up, and confirm `/studio` and `/library` load — that satisfies "works for a
signed-out visitor landing fresh" from plan.md's MVP list.

## Known gap at deploy time

Hugging Face's free-tier credits are depleted (documented in plan.md) — the
generation flow will reach `FAILED` with a real error message rather than
`COMPLETED` until that's topped up. This is expected, not a deploy bug; the
library UI treats `FAILED` as a first-class, real state for exactly this
reason.
