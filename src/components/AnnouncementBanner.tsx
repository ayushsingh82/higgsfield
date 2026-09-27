"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "banner-dismissed-v1";

export function AnnouncementBanner() {
  // Defaults to visible (including in the server-rendered HTML) and hides
  // itself post-mount only if this viewer already dismissed it — avoids a
  // pop-in flash for the common case (first visit, nothing dismissed yet).
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) setVisible(false);
    } catch {
      // no-op — stays visible, which is the safe default
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // best-effort only — a per-viewer convenience, not state that must persist
    }
  }

  if (!visible) return null;

  return (
    <div className="mono flex items-center justify-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-center text-xs text-[var(--muted-foreground)]">
      <span>One core loop, built and shipped in 24 hours — not a feature list, a bet on what to cut.</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        ✕
      </button>
    </div>
  );
}
