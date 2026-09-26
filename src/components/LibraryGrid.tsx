"use client";

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

  if (error) return <p className="mono text-sm text-[var(--ink-muted)]">{error}</p>;
  if (rows === null) return <p className="mono text-sm text-[var(--ink-muted)]">loading…</p>;
  if (rows.length === 0) return <p className="mono text-sm text-[var(--ink-muted)]">nothing yet — go generate something.</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <GenerationCard key={row.id} row={row} />
      ))}
    </div>
  );
}

function GenerationCard({ row }: { row: GenerationRow }) {
  return (
    <div
      className={`rounded-sm border p-4 ${
        row.status === "FAILED" ? "border-[var(--danger)] bg-[var(--danger-bg)]" : "border-[var(--line)] bg-[var(--paper-raised)]"
      }`}
    >
      <div className="mono mb-2 flex items-center justify-between text-xs text-[var(--ink-muted)]">
        <StatusBadge status={row.status} />
        <span>
          {row.aspectRatio} · {row.durationSec}s · {row.creditsCost} credits
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-sm">{row.prompt}</p>

      {row.status === "COMPLETED" && row.videoUrl && <VideoPlayer src={row.videoUrl} />}

      {row.status === "FAILED" && (
        <p className="mono rounded-sm bg-[var(--paper-raised)] p-2 text-xs text-[var(--danger)]">
          {row.errorMessage ?? "generation failed"}
        </p>
      )}

      {!isTerminal(row.status) && (
        <div className="mono flex items-center gap-2 text-xs text-[var(--ink-muted)]">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
          {row.status === "PENDING" ? "queued…" : "generating…"}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: GenerationStatus }) {
  const styles: Record<GenerationStatus, string> = {
    PENDING: "text-[var(--ink-muted)]",
    IN_PROGRESS: "text-[var(--accent)]",
    COMPLETED: "text-[var(--ok)]",
    FAILED: "text-[var(--danger)]",
  };
  return <span className={styles[status]}>{status.toLowerCase().replace("_", " ")}</span>;
}
