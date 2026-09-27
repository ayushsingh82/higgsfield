"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      className="transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
      onClick={handleLogout}
      disabled={loading}
      type="button"
    >
      {loading ? "logging out…" : "log out"}
    </button>
  );
}
