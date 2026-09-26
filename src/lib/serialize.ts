import type { Generation } from "@prisma/client";
import { getPublicUrl } from "./storage";

export function serializeGeneration(gen: Generation) {
  return {
    ...gen,
    videoUrl: gen.outputKey ? getPublicUrl(gen.outputKey) : null,
  };
}
