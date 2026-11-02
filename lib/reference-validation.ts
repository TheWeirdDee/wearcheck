import { z } from "zod";
import { ColourFamily, FootwearStyle, RenderCategory, type Requirements } from "./schemas";

export const ReferenceObservation = z.object({
  category: RenderCategory.nullable(),
  single_item: z.boolean(),
  usable_product_photo: z.boolean(),
  colours: z.array(ColourFamily).min(1).max(8),
  colours_clear: z.boolean(),
  footwear_style: FootwearStyle.nullable(),
  dress_code_fit: z.enum(["meets", "conflicts", "unclear", "not_provided"]),
  rule_checks: z.array(z.object({ rule_id: z.string().max(32), result: z.enum(["meets", "conflicts", "unclear", "unaffected"]), reason: z.string().max(240) })).max(20),
  explanation: z.string().max(400),
});
export type ReferenceObservation = z.infer<typeof ReferenceObservation>;

/** Unknown evidence cannot admit a paid attempt. A reference cannot certify the whole outfit. */
export function referenceProblem(observed: ReferenceObservation, category: RenderCategory, req: Requirements): string | null {
  if (!observed.single_item || !observed.usable_product_photo || observed.category !== category) return "Use a clear product photo of one item in the selected category (one pair for shoes). " + observed.explanation;
  if (!observed.colours_clear) return "The reference colours could not be read confidently. Use a clearer image.";
  if (req.dress_code && observed.dress_code_fit !== "meets") return `This item has not been shown to suit “${req.dress_code.value}”. Ask your host for specific guidance or use another reference.`;
  for (const r of req.rules) {
    if (r.type === "colour_exclusion" && observed.colours.some((c) => r.colours.includes(c))) return `This item conflicts with “${r.summary}”.`;
    if (r.type === "colour_request" && r.colours.length && !observed.colours.some((c) => r.colours.includes(c))) return `This item does not show the requested colour: “${r.summary}”.`;
    if (category === "shoes" && ["footwear_preference", "footwear_requirement"].includes(r.type)) {
      const style = observed.footwear_style;
      if (!style || r.footwear_avoid.includes(style) || (r.footwear_prefer.length && !r.footwear_prefer.includes(style))) return `These shoes have not been shown to meet “${r.summary}”.`;
    }
    if (["garment_exclusion", "garment_requirement", "coverage", "other"].includes(r.type)) {
      const check = observed.rule_checks.find((c) => c.rule_id === r.id);
      if (!check || !["meets", "unaffected"].includes(check.result)) return `This reference has not been shown to meet “${r.summary}”. ${check?.reason ?? "No reliable evidence was returned."}`;
    }
  }
  return null;
}
