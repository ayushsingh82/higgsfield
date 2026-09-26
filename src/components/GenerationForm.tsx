"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ALLOWED_IMAGE_TYPES, ASPECT_RATIOS, DURATIONS_SEC, GENERATION_COST, MAX_IMAGE_BYTES } from "@/lib/constants";

export function GenerationForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIOS)[number]>("16:9");
  const [durationSec, setDurationSec] = useState<(typeof DURATIONS_SEC)[number]>(4);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(file: File | null) {
    setError(null);
    if (file) {
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        setError(`unsupported file type "${file.type || "unknown"}" — use PNG, JPEG, or WebP`);
        setReferenceFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`file too large — 10MB max, got ${(file.size / 1024 / 1024).toFixed(1)}MB`);
        setReferenceFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }
    setReferenceFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let referenceImageUrl: string | undefined;

    if (referenceFile) {
      setStage("uploading");
      const form = new FormData();
      form.append("file", referenceFile);
      const uploadRes = await fetch("/api/uploads", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        setStage("idle");
        setError(body.error ?? "reference image upload failed");
        return;
      }
      referenceImageUrl = (await uploadRes.json()).url;
    }

    setStage("submitting");
    const res = await fetch("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, referenceImageUrl, aspectRatio, durationSec }),
    });
    setStage("idle");

    if (res.status === 401) {
      setError("log in to generate");
      return;
    }
    if (res.status === 402) {
      setError("not enough credits");
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "generation failed to start");
      return;
    }

    router.push("/library");
  }

  const busy = stage !== "idle";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mono mb-1 block text-xs text-[var(--ink-muted)]">prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A calm ocean wave rolling onto a sandy beach at sunset, cinematic lighting…"
          required
          rows={4}
          className="w-full rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] p-3"
        />
      </div>

      <div>
        <label className="mono mb-1 block text-xs text-[var(--ink-muted)]">reference image (optional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="mono text-sm"
        />
        <p className="mono mt-1 text-xs text-[var(--ink-muted)]">
          {referenceFile ? referenceFile.name : "PNG, JPEG, or WebP, 10MB max"}
        </p>
      </div>

      <div className="mono flex gap-6 text-sm">
        <label className="flex flex-col gap-1">
          aspect
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as (typeof ASPECT_RATIOS)[number])}
            className="rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] px-2 py-1"
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          duration
          <select
            value={durationSec}
            onChange={(e) => setDurationSec(Number(e.target.value) as (typeof DURATIONS_SEC)[number])}
            className="rounded-sm border border-[var(--line)] bg-[var(--paper-raised)] px-2 py-1"
          >
            {DURATIONS_SEC.map((d) => (
              <option key={d} value={d}>
                {d}s
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--line)] pt-4">
        <span className="mono text-sm text-[var(--ink-muted)]">{GENERATION_COST} credits</span>
        <button
          type="submit"
          disabled={busy}
          className="mono rounded-sm bg-[var(--accent)] px-5 py-2 text-sm text-[var(--accent-ink)] disabled:opacity-50"
        >
          {stage === "uploading" ? "uploading reference…" : stage === "submitting" ? "starting…" : "generate"}
        </button>
      </div>

      {error && <p className="mono text-sm text-[var(--danger)]">{error}</p>}
    </form>
  );
}
