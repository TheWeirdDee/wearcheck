import type { RenderCategory } from "./schemas";

/** Plain-language description of each try-on operation, shown before anything is generated. */
export const CATEGORY_META: Record<RenderCategory, { label: string; noun: string; replaces: string; provider: "Clothes V4" | "Shoes V3"; plain: string }> = {
  upper_body: {
    label: "Top", noun: "top", replaces: "Replaces your top — shirt, blouse or T-shirt — and keeps the rest.",
    provider: "Clothes V4", plain: "YouCam Clothes V4 redraws one garment in your photo to look like the reference garment.",
  },
  outer: {
    label: "Outer layer", noun: "outer layer", replaces: "Adds or replaces a jacket or coat over what you're wearing.",
    provider: "Clothes V4", plain: "YouCam Clothes V4 redraws one garment in your photo to look like the reference garment.",
  },
  full_body: {
    label: "Full outfit or dress", noun: "full outfit", replaces: "Replaces your outfit from shoulders to hem; your shoes stay.",
    provider: "Clothes V4", plain: "YouCam Clothes V4 redraws one garment in your photo to look like the reference garment.",
  },
  shoes: {
    label: "Shoes", noun: "shoes", replaces: "Replaces the shoes you're wearing and keeps everything else.",
    provider: "Shoes V3", plain: "YouCam Shoes V3 redraws the shoes in your photo to look like the reference pair.",
  },
};
