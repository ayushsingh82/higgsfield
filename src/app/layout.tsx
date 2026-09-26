import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata = {
  title: "higgsfield",
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
        <header className="border-b border-[var(--line)] bg-[var(--paper-raised)]">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              higgsfield <span className="mono text-sm font-normal text-[var(--ink-muted)]">/ cinema studio</span>
            </Link>
            <nav className="mono flex items-center gap-5 text-sm">
              <Link href="/studio" className="hover:underline">
                studio
              </Link>
              <Link href="/library" className="hover:underline">
                library
              </Link>
              {user ? (
                <>
                  <span className="text-[var(--ink-muted)]">{user.credits} credits</span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:underline">
                    log in
                  </Link>
                  <Link href="/signup" className="hover:underline">
                    sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-6 py-10">{children}</div>
      </body>
    </html>
  );
}
