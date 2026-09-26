import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Hosted S3-compatible object storage (per plan.md's architecture call — not
 * local disk, so uploads/outputs survive redeploys/restarts on the
 * always-on host without needing a persistent volume). Works with any
 * S3-compatible provider (Cloudflare R2, Backblaze B2, real AWS S3, etc.) by
 * pointing S3_ENDPOINT at that provider; assumes the bucket is public (or
 * fronted by a CDN) at STORAGE_PUBLIC_BASE_URL, so no signed-URL generation
 * is needed for playback.
 */
let client: S3Client | undefined;

function getClient(): S3Client {
  if (client) return client;
  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY must be set");
  }
  client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION || "auto",
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  return client;
}

export async function uploadObject(key: string, body: Blob | Buffer, contentType: string): Promise<void> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not set");

  const payload = body instanceof Blob ? Buffer.from(await body.arrayBuffer()) : body;

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: payload,
      ContentType: contentType,
    })
  );
}

export function getPublicUrl(key: string): string {
  const base = process.env.STORAGE_PUBLIC_BASE_URL;
  if (!base) throw new Error("STORAGE_PUBLIC_BASE_URL is not set");
  return `${base.replace(/\/$/, "")}/${key}`;
}
