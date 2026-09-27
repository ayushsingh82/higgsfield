import type { NextRequest } from "next/server";

/** Returns null on a missing/malformed body instead of throwing — callers turn that into a clean 400. */
export async function parseJsonBody<T = Record<string, unknown>>(req: NextRequest): Promise<T | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
