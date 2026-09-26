/**
 * Thin wrapper around a hosted S3-compatible bucket. Swap the body of these
 * two functions for your provider's SDK (e.g. @aws-sdk/client-s3) — kept as a
 * narrow interface so the rest of the app never touches the SDK directly.
 */

export async function uploadObject(key: string, body: Blob | Buffer, contentType: string): Promise<void> {
  throw new Error(`storage.uploadObject not wired yet: ${key} (${contentType})`);
}

export function getPublicUrl(key: string): string {
  const base = process.env.STORAGE_PUBLIC_BASE_URL;
  if (!base) throw new Error("STORAGE_PUBLIC_BASE_URL is not set");
  return `${base.replace(/\/$/, "")}/${key}`;
}
