// Vitest doesn't load .env the way Next.js does — load it manually so
// tests hitting real Postgres (credits.test.ts) get DATABASE_URL.
try {
  process.loadEnvFile(".env");
} catch {
  // .env may not exist in CI; env vars are expected to be set another way there.
}
