import { InferenceClient, type InferenceProvider } from "@huggingface/inference";

/**
 * Verified against Hugging Face's routed Inference Providers (huggingface_hub
 * Python client, same underlying API) on 2026-09-27: text-to-video via
 * provider "replicate" and image-to-video via provider "wavespeed" both
 * produced real, playable .mp4 output. `replicate` does not support
 * image-to-video at all on HF's router (hard error) — that's why the two
 * tasks use different providers, not a typo.
 *
 * The `inputs`/`parameters` shape below matches HF's documented REST schema
 * for these tasks, and the request path itself is now confirmed by a live JS
 * call on 2026-09-27 (see plan.md) — the call correctly reached HF's router
 * and was rejected only by depleted monthly credits, not a malformed request.
 * `provider` is a per-call arg on `BaseArgs`, NOT a constructor default (the
 * Python client's `InferenceClient(provider=...)` constructor pattern does
 * NOT carry over to JS — passing it to `new InferenceClient(token, {
 * provider })` is silently ignored, and the client falls back to "auto"
 * provider selection instead. Caught via the depleted-credits error message
 * naming "auto" instead of the intended provider.
 */
const TASK_PROVIDER: Record<"text-to-video" | "image-to-video", { provider: InferenceProvider; model: string }> = {
  "text-to-video": { provider: "replicate", model: "Wan-AI/Wan2.2-TI2V-5B" },
  "image-to-video": { provider: "wavespeed", model: "Wan-AI/Wan2.2-I2V-A14B" },
};

interface GenerateVideoParams {
  prompt: string;
  referenceImageUrl?: string;
}

export interface VideoGenResult {
  provider: InferenceProvider;
  model: string;
  video: Blob;
}

// Takes either a storage key or a resolved URL — it only checks presence,
// the caller decides what "reference image" means at its layer.
export function pickProviderModel(referenceImage?: string) {
  return referenceImage ? TASK_PROVIDER["image-to-video"] : TASK_PROVIDER["text-to-video"];
}

export async function generateVideo({ prompt, referenceImageUrl }: GenerateVideoParams): Promise<VideoGenResult> {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) throw new Error("HF_TOKEN is not set");

  const { provider, model } = pickProviderModel(referenceImageUrl);
  const client = new InferenceClient(hfToken);

  const video = referenceImageUrl
    ? await client.imageToVideo({
        provider,
        model,
        // imageToVideo's `inputs` type is Blob, not a URL string (confirmed
        // by tsc against @huggingface/inference's own types) — fetch the
        // reference image ourselves rather than passing the URL through.
        inputs: await fetchAsBlob(referenceImageUrl),
        parameters: { prompt },
      })
    : await client.textToVideo({ provider, model, inputs: prompt });

  return { provider, model, video };
}

async function fetchAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  // Deliberately not including `url` here: it's a presigned URL (bearer
  // credential for its validity window), and this message can end up
  // stored and shown to the user via Generation.errorMessage.
  if (!res.ok) throw new Error(`failed to fetch reference image (HTTP ${res.status})`);
  return res.blob();
}
