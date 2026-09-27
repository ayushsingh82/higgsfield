import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata = {
  title: { default: "higgsfield — Cinema Studio", template: "%s · higgsfield" },
  description: "Prompt-to-video, one core loop, done well.",
};

async function getHeaderUser() {
  try {
    const userId = await getCurrentUserId();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, credits: true } });
    return user;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getHeaderUser();

  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
              higgsfield <span className="mono hidden text-sm font-normal text-[var(--muted-foreground)] sm:inline">/ cinema studio</span>
            </Link>
            <nav className="mono flex items-center gap-3 text-sm text-[var(--muted-foreground)] sm:gap-5">
              <Link href="/studio" className="transition-colors hover:text-[var(--foreground)]">
                studio
              </Link>
              <Link href="/library" className="transition-colors hover:text-[var(--foreground)]">
                library
              </Link>
              {user ? (
                <>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs whitespace-nowrap text-[var(--foreground)]">
                    {user.credits} credits
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="transition-colors hover:text-[var(--foreground)]">
                    log in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-[var(--brand-ink)] transition-opacity hover:opacity-90"
                  >
                    sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">{children}</div>
      </body>
    </html>
  );
}
