import Link from "next/link";

const REPO_URL = "https://github.com/ayushsingh82/higgsfield";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-[var(--muted-foreground)] sm:flex-row sm:px-6">
        <span className="mono">© {new Date().getFullYear()} higgsfield — built for the 8x take-home</span>
        <div className="mono flex items-center gap-4">
          <Link href="/studio" className="transition-colors hover:text-[var(--foreground)]">
            studio
          </Link>
          <Link href="/library" className="transition-colors hover:text-[var(--foreground)]">
            library
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-[var(--foreground)]"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
