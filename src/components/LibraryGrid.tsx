"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VideoPlayer } from "./VideoPlayer";

type GenerationStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

interface GenerationRow {
  id: string;
  prompt: string;
  status: GenerationStatus;
  aspectRatio: string;
  durationSec: number;
  creditsCost: number;
  errorMessage: string | null;
  videoUrl: string | null;
  createdAt: string;
}

const POLL_MS = 2000;
const isTerminal = (status: GenerationStatus) => status === "COMPLETED" || status === "FAILED";

export function LibraryGrid() {
  const [rows, setRows] = useState<GenerationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/generations");
      if (cancelled) return;
      if (res.status === 401) {
        setError("log in to see your library");
        setRows([]);
        return;
      }
      if (!res.ok) {
        setError("couldn't load library");
        return;
      }
      setRows(await res.json());
    }

    load();
    timerRef.current = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (error) return <p className="mono text-sm text-[var(--muted-foreground)]">{error}</p>;
  if (rows === null) return <p className="mono text-sm text-[var(--muted-foreground)]">loading…</p>;
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
        <p className="mono mb-3 text-sm text-[var(--muted-foreground)]">Nothing here yet.</p>
        <Link
          href="/studio"
          className="mono inline-flex rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-ink)] transition-opacity hover:opacity-90"
        >
          Generate your first video →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <GenerationCard key={row.id} row={row} />
      ))}
    </div>
  );
}

const STATUS_ACCENT: Record<GenerationStatus, string> = {
  PENDING: "border-[var(--border)]",
  IN_PROGRESS: "border-[var(--pending)]/40",
  COMPLETED: "border-[var(--ok)]/40",
  FAILED: "border-[var(--danger)]/50",
};

function GenerationCard({ row }: { row: GenerationRow }) {
  return (
    <div
      className={`rounded-2xl border bg-[var(--surface)] p-4 transition-colors ${STATUS_ACCENT[row.status]} ${
        row.status === "FAILED" ? "bg-[var(--danger-bg)]" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <StatusBadge status={row.status} />
        <span className="mono text-xs text-[var(--muted-foreground)]">
          {row.aspectRatio} · {row.durationSec}s · {row.creditsCost} credits
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-[var(--foreground)]">{row.prompt}</p>

      {row.status === "COMPLETED" && row.videoUrl && <VideoPlayer src={row.videoUrl} />}

      {row.status === "FAILED" && (
        <div className="rounded-lg bg-[var(--surface-raised)] p-2.5">
          <p className="mono mb-1 text-[0.65rem] uppercase tracking-wide text-[var(--muted-foreground)]">
            Provider response (shown as-is, not summarized)
          </p>
          <p className="mono text-xs text-[var(--danger)]">{row.errorMessage ?? "generation failed"}</p>
        </div>
      )}

      {!isTerminal(row.status) && (
        <div className="mono flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--pending)]" />
          {row.status === "PENDING" ? "queued…" : "generating…"}
        </div>
      )}
    </div>
  );
}

const STATUS_BADGE: Record<GenerationStatus, string> = {
  PENDING: "bg-[var(--surface-raised)] text-[var(--muted-foreground)]",
  IN_PROGRESS: "bg-[var(--pending-bg)] text-[var(--pending)]",
  COMPLETED: "bg-[var(--ok-bg)] text-[var(--ok)]",
  FAILED: "bg-[var(--danger-bg)] text-[var(--danger)]",
};

function StatusBadge({ status }: { status: GenerationStatus }) {
  return (
    <span className={`mono inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[status]}`}>
      {status.toLowerCase().replace("_", " ")}
    </span>
  );
}
