"use client";

import { useState } from "react";

export function GenerationForm() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const res = await fetch("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    setStatus(res.ok ? "queued" : "error");
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the video..." />
      <button type="submit">Generate</button>
      {status && <p>{status}</p>}
    </form>
  );
}
