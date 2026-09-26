export const GENERATION_COST = 10;

export const ASPECT_RATIOS = ["16:9", "9:16"] as const;
export const DURATIONS_SEC = [4, 6, 8] as const;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
