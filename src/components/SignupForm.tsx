"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setSubmitting(false);
    submittingRef.current = false;
    if (res.ok) {
      router.push("/studio");
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(body.error ?? "signup failed");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 outline-none focus:border-[var(--brand)]"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        minLength={8}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 outline-none focus:border-[var(--brand)]"
      />
      <button
        type="submit"
        disabled={submitting}
        className="mono w-full rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-[var(--brand-ink)] disabled:opacity-50"
      >
        {submitting ? "creating account…" : "create account"}
      </button>
      {error && <p className="mono mt-3 text-sm text-[var(--danger)]">{error}</p>}
    </form>
  );
}
