import type { Generation } from "@prisma/client";
import { getSignedDownloadUrl } from "./storage";

export async function serializeGeneration(gen: Generation) {
  return {
    ...gen,
    videoUrl: gen.outputKey ? await getSignedDownloadUrl(gen.outputKey) : null,
  };
}
