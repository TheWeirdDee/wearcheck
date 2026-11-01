import { z } from "zod";

// ---------- shared vocabularies ----------
export const COLOUR_FAMILIES = [
  "white", "ivory_cream", "beige", "black", "grey", "navy", "blue", "red", "burgundy", "pink",
  "green", "yellow", "orange", "purple", "brown", "gold", "silver", "multicolour", "other",
] as const;
export const ColourFamily = z.enum(COLOUR_FAMILIES);
export type ColourFamily = z.infer<typeof ColourFamily>;

export const COLOUR_LABEL: Record<ColourFamily, string> = {
  white: "white", ivory_cream: "ivory / cream", beige: "beige", black: "black", grey: "grey", navy: "navy",
  blue: "blue", red: "red", burgundy: "burgundy", pink: "pink", green: "green", yellow: "yellow", orange: "orange",
  purple: "purple", brown: "brown", gold: "gold", silver: "silver", multicolour: "multicoloured", other: "another colour",
};

export const FOOTWEAR_STYLES = [
  "stiletto_heel", "kitten_heel", "block_heel", "wedge", "flat", "flat_sandal", "heeled_sandal", "sneaker", "boot", "loafer", "other",
] as const;
export const FootwearStyle = z.enum(FOOTWEAR_STYLES);
export type FootwearStyle = z.infer<typeof FootwearStyle>;

export const FOOTWEAR_LABEL: Record<FootwearStyle, string> = {
  stiletto_heel: "narrow high heels", kitten_heel: "kitten heels", block_heel: "block heels", wedge: "wedges",
  flat: "flats", flat_sandal: "flat sandals", heeled_sandal: "heeled sandals", sneaker: "trainers / sneakers",
  boot: "boots", loafer: "loafers", other: "other footwear",
};

export const EVENT_TYPES = ["wedding", "work", "celebration", "religious", "other"] as const;
export const EventType = z.enum(EVENT_TYPES);

export const RequirementSource = z.enum(["invitation", "user", "suggested"]);
export type RequirementSource = z.infer<typeof RequirementSource>;

export const RULE_TYPES = [
  "footwear_preference", "footwear_requirement", "colour_exclusion", "colour_request",
  "garment_exclusion", "garment_requirement", "coverage", "other",
] as const;
export const RuleType = z.enum(RULE_TYPES);
export type RuleType = z.infer<typeof RuleType>;

// ---------- confirmed requirements (user is the authority) ----------
const shortText = (max: number) => z.string().trim().max(max);

export const Rule = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,32}$/),
    type: RuleType,
    summary: shortText(200).min(1),
    severity: z.enum(["hard", "advisory"]),
    source: RequirementSource,
    evidence_text: shortText(300).nullable(),
    colours: z.array(ColourFamily).max(8).default([]),
    footwear_avoid: z.array(FootwearStyle).max(8).default([]),
    footwear_prefer: z.array(FootwearStyle).max(8).default([]),
  })
  .refine((r) => r.source !== "invitation" || (r.evidence_text && r.evidence_text.length > 0), {
    message: "Invitation rules need their exact source text",
  })
  .refine((r) => r.source !== "suggested" || r.severity === "advisory", {
    message: "Suggestions can never be hard rules",
  });
export type Rule = z.infer<typeof Rule>;

export const Requirements = z.object({
  event_name: shortText(120).nullable(),
  event_type: EventType.nullable(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dress_code: z
    .object({ value: shortText(120).min(1), source: RequirementSource, evidence_text: shortText(300).nullable(), ambiguous: z.boolean().default(false) })
    .nullable(),
  venue: z.object({
    setting: z.enum(["indoor", "outdoor", "mixed", "unknown"]),
    surface: z.enum(["grass", "sand", "gravel", "cobblestone", "hard_floor", "unknown"]).default("unknown"),
    source: RequirementSource,
    evidence_text: shortText(300).nullable(),
  }),
  rules: z.array(Rule).max(20),
  notes: z.array(shortText(300)).max(10).default([]),
  no_restrictions_stated: z.boolean().default(false),
  uncertainties: z.array(shortText(300)).max(10).default([]),
  origin: z.enum(["invitation_image", "manual", "demo_manual"]),
});
export type Requirements = z.infer<typeof Requirements>;

/** Requirements are only usable once a user confirms an occasion or dress-code context. */
export function hasMinimumContext(r: Requirements) {
  return Boolean(r.event_type || r.dress_code || r.event_name || r.no_restrictions_stated);
}

// ---------- manual entry ----------
export const ManualDetails = z.object({
  event_name: shortText(120).optional().default(""),
  event_type: EventType.nullable().optional().default(null),
  dress_code: shortText(120).optional().default(""),
  setting: z.enum(["indoor", "outdoor", "mixed", "unknown"]).default("unknown"),
  restrictions: shortText(1000).optional().default(""),
  event_date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().default(""),
});
export type ManualDetails = z.infer<typeof ManualDetails>;

// ---------- model outputs (validated before use) ----------
export const InvitationExtraction = z.object({
  readable: z.boolean(),
  full_text: z.string().max(6000),
  event_name: z.string().max(120).nullable(),
  event_type: EventType.nullable(),
  event_date: z.string().max(20).nullable(),
  dress_code_text: z.string().max(200).nullable(),
  dress_code_is_ambiguous: z.boolean(),
  venue_setting: z.enum(["indoor", "outdoor", "mixed", "unknown"]),
  venue_surface: z.enum(["grass", "sand", "gravel", "cobblestone", "hard_floor", "unknown"]),
  venue_evidence_text: z.string().max(300).nullable(),
  rules: z
    .array(
      z.object({
        type: RuleType,
        summary: z.string().max(200),
        evidence_text: z.string().max(300),
        wording_strength: z.enum(["requirement", "request", "recommendation"]),
        colours: z.array(ColourFamily).max(8),
        footwear_avoid: z.array(FootwearStyle).max(8),
        footwear_prefer: z.array(FootwearStyle).max(8),
      }),
    )
    .max(15),
  suggestions: z.array(z.object({ type: RuleType, summary: z.string().max(200), reason: z.string().max(300) })).max(5),
  uncertainties: z.array(z.string().max(300)).max(8),
});
export type InvitationExtraction = z.infer<typeof InvitationExtraction>;

export const OBSERVED_CATEGORIES = ["dress", "top", "bottom", "jumpsuit", "suit", "outerwear", "shoes", "accessory"] as const;

export const OutfitObservation = z.object({
  person_count: z.enum(["none", "one", "multiple", "unclear"]),
  face_visible: z.boolean(),
  full_body_visible: z.boolean(),
  feet_visible: z.enum(["yes", "partial", "no"]),
  facing: z.enum(["front", "angled", "side", "back", "unclear"]),
  image_quality: z.enum(["good", "fair", "poor"]),
  lighting: z.enum(["good", "dim", "harsh", "mixed"]),
  items: z
    .array(
      z.object({
        category: z.enum(OBSERVED_CATEGORIES),
        description: z.string().max(160),
        colour_family: ColourFamily,
        colour_certainty: z.enum(["clear", "uncertain"]),
        visibility: z.enum(["clear", "partial", "occluded"]),
        footwear_style: FootwearStyle.nullable(),
      }),
    )
    .max(10),
  formality_impression: z.enum(["casual", "smart_casual", "formal", "black_tie", "unclear"]),
  rule_checks: z
    .array(
      z.object({
        rule_id: z.string().max(32),
        assessment: z.enum(["appears_consistent", "may_conflict", "cannot_tell"]),
        explanation: z.string().max(240),
      }),
    )
    .max(20),
  unobservable: z.array(z.string().max(80)).max(10),
});
export type OutfitObservation = z.infer<typeof OutfitObservation>;

// User answers to targeted clarification questions override model observations.
export const UserCorrections = z.object({
  main_garment_colour: ColourFamily.optional(),
  footwear_style: FootwearStyle.optional(),
  rule_answers: z.record(z.string().max(32), z.enum(["applies", "does_not_apply"])).optional(),
});
export type UserCorrections = z.infer<typeof UserCorrections>;

// ---------- findings ----------
export const RenderCategory = z.enum(["shoes", "full_body", "upper_body", "outer"]);

/** Body of POST /api/render-jobs. `findingId` is a rule finding id or "voluntary:<category>". */
export const RenderJobRequest = z.object({
  checkId: z.uuid(),
  findingId: z.string().max(40),
  itemId: z.string().max(64).optional(),
  userAssetId: z.uuid().optional(),
  userCategory: RenderCategory.optional(),
  retry: z.boolean().optional(),
});
export type RenderCategory = z.infer<typeof RenderCategory>;

export type FindingArea = "clothing" | "colour" | "shoes_venue";
export type FindingKind = "explicit_rule" | "explicit_preference" | "practical" | "style_suggestion" | "visibility";
export type FindingStatus = "conflict" | "consider_change" | "ok" | "cant_assess";
export type EvidenceSource = "invitation" | "user" | "suggested" | "photo_model" | "user_correction";

export type Finding = {
  id: string;
  rule_id: string | null;
  area: FindingArea;
  kind: FindingKind;
  status: FindingStatus;
  observation: string;
  reason: string;
  evidence_text: string | null;
  evidence_source: EvidenceSource;
  uncertainty: string | null;
  user_action: "preview_shoes" | "preview_garment" | "retake_photo" | "none";
  render_category: RenderCategory | null;
  rank: number;
};

export type Clarification = {
  id: "main_garment_colour" | "footwear_style" | `rule:${string}`;
  question: string;
  options: { value: string; label: string }[];
};

export type AssessmentStatus = "compatible" | "consider_change" | "conflict" | "insufficient";

export type AssessmentResult = {
  status: AssessmentStatus;
  headline: string;
  key_finding_id: string | null;
  findings: Finding[];
  rows: Record<FindingArea, { status: "no_issue" | "needs_look" | "conflict" | "cant_assess"; summary: string }>;
  clarification: Clarification | null;
  shoes_assessable: boolean;
  primary_action: { finding_id: string; render_category: RenderCategory } | null;
};
