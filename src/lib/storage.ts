import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Hosted S3-compatible object storage (per plan.md's architecture call — not
 * local disk, so uploads/outputs survive redeploys/restarts on the
 * always-on host without needing a persistent volume). Works with any
 * S3-compatible provider (Cloudflare R2, Backblaze B2, real AWS S3, etc.) by
 * pointing S3_ENDPOINT at that provider.
 *
 * The bucket is private, not a public bucket behind a base URL (B2 wants
 * payment history or a one-time fee to make a bucket public — avoided that,
 * and a private bucket + presigned GET URLs is arguably better practice
 * regardless). B2's S3-compatible API confirmed to support standard AWS
 * SigV4 presigned URLs (checked their docs, not assumed identical to plain
 * AWS S3), which is exactly what @aws-sdk/s3-request-presigner produces.
 */
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour — plenty for viewing a video in the library grid or fetching a reference image during generation, not meant as a permanent link

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

function requireBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is not set");
  return bucket;
}

export async function uploadObject(key: string, body: Blob | Buffer, contentType: string): Promise<void> {
  const payload = body instanceof Blob ? Buffer.from(await body.arrayBuffer()) : body;

  await getClient().send(
    new PutObjectCommand({
      Bucket: requireBucket(),
      Key: key,
      Body: payload,
      ContentType: contentType,
    })
  );
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: requireBucket(), Key: key }), {
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  });
}
