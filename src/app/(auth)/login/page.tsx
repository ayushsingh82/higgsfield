"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setSubmitting(false);
    if (res.ok) {
      router.push("/studio");
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(body.error ?? "login failed");
  }

  return (
    <main className="max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] px-3 py-2"
        />
        <button
          type="submit"
          disabled={submitting}
          className="mono w-full rounded-sm bg-[var(--accent)] px-4 py-2 text-sm text-[var(--accent-ink)] disabled:opacity-50"
        >
          {submitting ? "logging in…" : "log in"}
        </button>
      </form>
      {error && <p className="mono text-sm text-[var(--danger)]">{error}</p>}
    </main>
  );
}
