import Link from "next/link";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

export default function HomePage() {
  return (
    <>
      <AnnouncementBanner />
      <main className="flex min-h-[70vh] flex-col justify-center space-y-6">
        <p className="mono text-xs uppercase tracking-[0.2em] text-[var(--brand)]">cinema studio</p>
        <h1 className="max-w-lg text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Write it. <span className="text-[var(--muted-foreground)]">Shoot it.</span>
        </h1>
        <p className="max-w-md text-[var(--muted-foreground)]">
          One prompt, one reference frame if you want it, one clip. No feed, no followers — just the loop that
          matters.
        </p>
        <div className="mono flex gap-4 text-sm">
          <Link
            href="/signup"
            className="rounded-full bg-[var(--brand)] px-5 py-2.5 font-medium text-[var(--brand-ink)] transition-opacity hover:opacity-90"
          >
            sign up →
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-[var(--border)] px-5 py-2.5 transition-colors hover:bg-[var(--surface)]"
          >
            log in
          </Link>
        </div>
      </main>
    </>
  );
}
