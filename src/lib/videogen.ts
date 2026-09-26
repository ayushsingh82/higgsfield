import { InferenceClient } from "@huggingface/inference";

/**
 * Verified against Hugging Face's routed Inference Providers (huggingface_hub
 * Python client, same underlying API) on 2026-09-27: text-to-video via
 * provider "replicate" and image-to-video via provider "wavespeed" both
 * produced real, playable .mp4 output. `replicate` does not support
 * image-to-video at all on HF's router (hard error) — that's why the two
 * tasks use different providers, not a typo.
 *
 * The `inputs`/`parameters` shape below matches HF's documented REST schema
 * for these tasks. It hasn't been round-tripped through this exact JS client
 * call yet (only the Python client was smoke-tested) — run one real
 * generation through the dev server before relying on this in front of users.
 */
const TASK_PROVIDER: Record<"text-to-video" | "image-to-video", { provider: string; model: string }> = {
  "text-to-video": { provider: "replicate", model: "Wan-AI/Wan2.2-TI2V-5B" },
  "image-to-video": { provider: "wavespeed", model: "Wan-AI/Wan2.2-I2V-A14B" },
};

interface GenerateVideoParams {
  prompt: string;
  referenceImageUrl?: string;
}

export interface VideoGenResult {
  provider: string;
  model: string;
  video: Blob;
}

export function pickProviderModel(referenceImageUrl?: string) {
  return referenceImageUrl ? TASK_PROVIDER["image-to-video"] : TASK_PROVIDER["text-to-video"];
}

export async function generateVideo({ prompt, referenceImageUrl }: GenerateVideoParams): Promise<VideoGenResult> {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) throw new Error("HF_TOKEN is not set");

  const { provider, model } = pickProviderModel(referenceImageUrl);
  const client = new InferenceClient(hfToken, { provider });

  const video = referenceImageUrl
    ? await client.imageToVideo({ model, inputs: referenceImageUrl, parameters: { prompt } })
    : await client.textToVideo({ model, inputs: prompt });

  return { provider, model, video };
}
