import type { RenderCategory } from "./schemas";

/** Plain-language description of each try-on operation, shown before anything is generated. */
export const CATEGORY_META: Record<RenderCategory, { label: string; noun: string; replaces: string; provider: "Clothes V4" | "Shoes V3"; plain: string }> = {
  upper_body: {
    label: "Top", noun: "top", replaces: "Targets your top — shirt, blouse or T-shirt. Other layers can also change.",
    provider: "Clothes V4", plain: "YouCam Clothes V4 generates a preview guided by the reference garment. Inspect every layer and your pose, not just the intended change.",
  },
  outer: {
    label: "Outer layer", noun: "outer layer", replaces: "Adds or replaces a jacket or coat over what you're wearing.",
    provider: "Clothes V4", plain: "YouCam Clothes V4 generates a preview guided by the reference garment. It can alter layers underneath too; inspect the whole result.",
  },
  full_body: {
    label: "Full outfit or dress", noun: "full outfit", replaces: "Targets your clothing from shoulders to hem. We ask YouCam to retain your shoes; check the result.",
    provider: "Clothes V4", plain: "YouCam Clothes V4 generates a preview guided by the reference garment. Inspect clothing, shoes and pose for unintended changes.",
  },
  shoes: {
    label: "Shoes", noun: "shoes", replaces: "Targets the shoes you're wearing. Check clothing and pose for unintended changes too.",
    provider: "Shoes V3", plain: "YouCam Shoes V3 generates a preview guided by the reference pair. It does not establish fit, comfort or grip.",
  },
};
