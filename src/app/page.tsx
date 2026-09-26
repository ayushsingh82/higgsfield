import Link from "next/link";

export default function HomePage() {
  return (
    <main className="space-y-6">
      <h1 className="text-4xl font-semibold tracking-tight">Write it. Shoot it.</h1>
      <p className="max-w-md text-[var(--ink-muted)]">
        One prompt, one reference frame if you want it, one clip. No feed, no followers — just the loop that
        matters.
      </p>
      <div className="mono flex gap-4 text-sm">
        <Link
          href="/signup"
          className="rounded-sm bg-[var(--accent)] px-4 py-2 text-[var(--accent-ink)] hover:opacity-90"
        >
          sign up →
        </Link>
        <Link href="/login" className="rounded-sm border border-[var(--line)] px-4 py-2 hover:bg-[var(--paper-raised)]">
          log in
        </Link>
      </div>
    </main>
  );
}
