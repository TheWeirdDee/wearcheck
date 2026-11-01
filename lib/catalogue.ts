import { COLOUR_LABEL, FOOTWEAR_LABEL, RenderCategory, type ColourFamily, type FootwearStyle, type ObservedOutfit, type Requirements, type Finding, type Rule } from "./schemas";

/**
 * Curated, licence-documented reference items (PRD §9). Files live in /public/reference with
 * full licence metadata in /public/reference/LICENSES.json. None of these is a shopping listing.
 */
export type CatalogueItem = {
  id: string;
  title: string;
  category: RenderCategory;
  file: string;
  width: number;
  height: number;
  colours: ColourFamily[];
  footwear_style: FootwearStyle | null;
  /** What the garment covers, for coverage and garment rules. Shoes leave this empty. */
  covers: Coverage[];
  /** Garment kinds this item counts as, for "no X" / "X required" rules. */
  kinds: string[];
  tags: string[];
  formality_tags: string[];
  terrain_tags: string[];
  source_name: string;
  source_url: string;
  creator: string;
  licence: string;
  licence_url: string;
  modifications: string;
  is_purchasable: false;
  sku: null;
  enabled: boolean;
};

export type Coverage = "shoulders" | "upper_arms" | "arms" | "knees" | "legs" | "chest";

export const SHOPPING_DISCLAIMER = "Visual reference — not a live shopping listing";

export const CATALOGUE: CatalogueItem[] = [
  {
    id: "loafer-black-tassel",
    title: "Black leather tassel loafer",
    category: "shoes",
    file: "loafer-black-tassel.jpg",
    width: 1400, height: 1050,
    colours: ["black"],
    footwear_style: "loafer",
    covers: [],
    kinds: ["loafer", "flat shoe", "closed toe"],
    tags: ["Flat", "Closed toe"],
    formality_tags: ["formal", "work", "smart"],
    terrain_tags: ["grass", "hard_floor", "gravel"],
    source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:946_black.jpg",
    creator: "Samansmaee",
    licence: "CC BY-SA 4.0",
    licence_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    modifications: "Trimmed to the shoe, padded with the original white background, resized.",
    is_purchasable: false, sku: null, enabled: true,
  },
  {
    id: "oxford-tan-captoe",
    title: "Tan leather cap-toe oxford",
    category: "shoes",
    file: "oxford-tan-captoe.jpg",
    width: 1400, height: 1050,
    colours: ["brown"],
    footwear_style: "flat",
    covers: [],
    kinds: ["oxford", "lace-up", "flat shoe", "closed toe"],
    tags: ["Lace-up", "Low heel"],
    formality_tags: ["formal", "work", "smart"],
    terrain_tags: ["grass", "hard_floor", "gravel"],
    source_name: "Wikimedia Commons (Wolf & Shepherd)",
    source_url: "https://commons.wikimedia.org/wiki/File:Web_HC-Right-angle.jpg",
    creator: "Justin Schneider",
    licence: "CC BY-SA 4.0",
    licence_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    modifications: "Trimmed to the shoes, padded with the original white background, resized.",
    is_purchasable: false, sku: null, enabled: true,
  },
  {
    id: "pump-nude-pointed",
    title: "Nude pointed-toe court heels",
    category: "shoes",
    file: "pump-nude-pointed.jpg",
    width: 1400, height: 1050,
    colours: ["beige"],
    footwear_style: "stiletto_heel",
    covers: [],
    kinds: ["heel", "court shoe", "pump", "closed toe"],
    tags: ["Pointed toe", "Slim heel"],
    formality_tags: ["formal", "cocktail"],
    terrain_tags: ["hard_floor"],
    source_name: "Wikimedia Commons (from Flickr)",
    source_url: "https://commons.wikimedia.org/wiki/File:Michael_Kors_MK-Flex_MID_Pump_40T2MFMP2L_taupe_-_dark_khaki_(1)_(16181589748).jpg",
    creator: "SPERA.de",
    licence: "CC BY 2.0",
    licence_url: "https://creativecommons.org/licenses/by/2.0/",
    modifications: "Trimmed to the shoes, padded with the original background, resized.",
    is_purchasable: false, sku: null, enabled: true,
  },
  {
    id: "wedge-black-sandal",
    title: "Black strap wedge sandal",
    category: "shoes",
    file: "wedge-black-sandal.jpg",
    width: 1400, height: 1050,
    colours: ["black"],
    footwear_style: "wedge",
    covers: [],
    kinds: ["wedge", "sandal", "open toe"],
    tags: ["Wedge sole", "Wide base"],
    formality_tags: ["formal", "cocktail"],
    terrain_tags: ["grass", "gravel"],
    source_name: "Wikimedia Commons (from Flickr)",
    source_url: "https://commons.wikimedia.org/wiki/File:WedgeHeel.jpg",
    creator: "glitter heels",
    licence: "CC BY 2.0",
    licence_url: "https://creativecommons.org/licenses/by/2.0/",
    modifications: "Resized and re-encoded as JPEG.",
    is_purchasable: false, sku: null, enabled: true,
  },
  {
    id: "flat-black-low-heel",
    title: "Black leather low-heel court shoe",
    category: "shoes",
    file: "flat-black-low-heel.jpg",
    width: 1400, height: 1400,
    colours: ["black"],
    footwear_style: "block_heel",
    covers: [],
    kinds: ["block heel", "court shoe", "closed toe"],
    tags: ["Low, wide heel", "Closed toe"],
    formality_tags: ["formal", "work"],
    terrain_tags: ["grass", "hard_floor"],
    source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:Professional_ballerina_-_ballerina_for_hostesses,_pilots_and_other_professionals.jpg",
    creator: "Ricardovfo",
    licence: "CC BY-SA 4.0",
    licence_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    modifications: "Resized and re-encoded as JPEG.",
    is_purchasable: false, sku: null, enabled: true,
  },
  {
    id: "top-blue-shirt",
    title: "Blue cotton button-down shirt",
    category: "upper_body",
    file: "top-blue-shirt.jpg",
    width: 1400, height: 1400,
    colours: ["blue"],
    footwear_style: null,
    covers: ["shoulders", "upper_arms", "arms", "chest"],
    kinds: ["shirt", "top", "collared", "long sleeve", "button-down"],
    tags: ["Long sleeves", "Collared"],
    formality_tags: ["smart", "work", "formal"],
    terrain_tags: [],
    source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:Blue_Business_Shirt.jpg",
    creator: "ChristianGlaeser",
    licence: "CC BY-SA 3.0",
    licence_url: "https://creativecommons.org/licenses/by-sa/3.0/",
    modifications: "Trimmed to the shirt, padded square with the original background, resized.",
    is_purchasable: false, sku: null, enabled: true,
  },
  {
    id: "dress-black-silk",
    title: "Black draped silk dress",
    category: "full_body",
    file: "dress-black-silk.jpg",
    width: 1050, height: 1400,
    colours: ["black"],
    footwear_style: null,
    covers: ["chest", "knees"],
    kinds: ["dress", "sleeveless", "knee length"],
    tags: ["Knee length", "Sleeveless"],
    formality_tags: ["formal", "cocktail"],
    terrain_tags: [],
    source_name: "Auckland War Memorial Museum, via Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:Black_silk_dress_by_Emma_Knuckey.jpg",
    creator: "Auckland Museum photographer; dress by Emma Knuckey",
    licence: "CC BY 4.0",
    licence_url: "https://creativecommons.org/licenses/by/4.0/",
    modifications: "Trimmed to the dress, padded with the original white background, resized.",
    is_purchasable: false, sku: null, enabled: true,
  },
];

export function catalogueItem(id: string) {
  return CATALOGUE.find((c) => c.id === id && c.enabled) ?? null;
}

export function availableCategories(): Partial<Record<RenderCategory, boolean>> {
  const out: Partial<Record<RenderCategory, boolean>> = {};
  for (const c of CATALOGUE) if (c.enabled) out[c.category] = true;
  return out;
}

/**
 * Categories a preview can be offered for: every YouCam-supported category, because the options
 * page always lets people upload their own item when no licensed reference fits (e.g. a top).
 */
export function previewableCategories(): Record<RenderCategory, boolean> {
  return Object.fromEntries(RenderCategory.options.map((c) => [c, true])) as Record<RenderCategory, boolean>;
}

const COVERAGE_WORDS: [RegExp, Coverage[]][] = [
  [/\b(sleeves?|arms?)\b/, ["upper_arms"]],
  [/\blong sleeves?\b/, ["arms"]],
  [/\bshoulders?\b/, ["shoulders"]],
  [/\bknees?\b/, ["knees"]],
  [/\b(legs?|ankles?|floor[- ]length|full[- ]length)\b/, ["legs"]],
  [/\b(chest|cleavage|neckline|low[- ]cut)\b/, ["chest"]],
];

/**
 * Whether a reference item meets one non-colour, non-footwear rule. Only rules we can read mechanically
 * (coverage words, "no <kind>" / "<kind> required") are decided; anything else is "unknown", and an
 * unknown item is never offered as a correction for that rule.
 */
export function meetsRule(item: CatalogueItem, r: Rule): boolean | "unknown" {
  const t = `${r.evidence_text ?? ""} ${r.summary}`.toLowerCase();
  if (item.category === "shoes") return r.type === "coverage" || r.type === "garment_exclusion" || r.type === "garment_requirement" ? true : "unknown";
  if (r.type === "coverage" || /\b(cover|covered|modest|sleeves?|shoulders?|knees?)\b/.test(t)) {
    const needed = COVERAGE_WORDS.filter(([re]) => re.test(t)).flatMap(([, c]) => c);
    if (!needed.length) return "unknown";
    return needed.every((c) => item.covers.includes(c));
  }
  const negative = /\b(no|not|avoid|without|prohibited|banned)\b/.test(t);
  const named = item.kinds.filter((k) => new RegExp(`\\b${k}s?\\b`).test(t));
  if (r.type === "garment_exclusion" || (r.type === "other" && negative && named.length)) return named.length === 0 ? (r.type === "garment_exclusion" ? true : "unknown") : false;
  if (r.type === "garment_requirement") return named.length > 0 ? true : "unknown";
  return "unknown";
}

/**
 * Filters to items that address the finding without breaking any other confirmed rule. Max 3.
 * The finding's own rule must be positively met; other garment/coverage rules must not be broken.
 * Used both to show options and to re-validate a render request on the server.
 */
export function optionsFor(finding: Pick<Finding, "render_category" | "rule_id">, req: Requirements): CatalogueItem[] {
  if (!finding.render_category) return [];
  const excluded = new Set(req.rules.filter((r) => r.type === "colour_exclusion").flatMap((r) => r.colours));
  const rule = finding.rule_id ? req.rules.find((r) => r.id === finding.rule_id) : null;
  const garmentRules = req.rules.filter((r) => ["garment_exclusion", "garment_requirement", "coverage", "other"].includes(r.type));
  return CATALOGUE.filter((c) => c.enabled && c.category === finding.render_category)
    .filter((c) => !c.colours.some((col) => excluded.has(col)))
    .filter((c) => garmentRules.every((r) => {
      const ok = meetsRule(c, r);
      return r === rule ? ok === true : ok !== false;
    }))
    .filter((c) => {
      if (c.category !== "shoes" || !c.footwear_style) return true;
      const footRules = req.rules.filter((r) => r.type === "footwear_preference" || r.type === "footwear_requirement");
      for (const r of footRules) {
        if (r.footwear_avoid.includes(c.footwear_style)) return false;
        if (r.footwear_prefer.length && !r.footwear_prefer.includes(c.footwear_style)) return false;
      }
      if (!rule && req.venue.surface !== "unknown") return c.terrain_tags.includes(req.venue.surface) || c.terrain_tags.length === 0;
      return true;
    });
}

export type RankedItem = { item: CatalogueItem; reasons: string[]; score: number };

const FORMALITY_FOR: [RegExp, string][] = [[/black tie|white tie|formal|evening/, "formal"], [/cocktail/, "cocktail"], [/business|work|office/, "work"], [/smart/, "smart"]];

/**
 * Every eligible reference in one category, ranked by how well it fits the *confirmed requirements* and the
 * *visible garment* it would replace, each with the reasons it's offered. Inputs are requirements and
 * observed clothing attributes only — never gender, body or appearance.
 */
export function rankOptions(target: { render_category: RenderCategory; rule_id: string | null }, req: Requirements, observed?: ObservedOutfit): RankedItem[] {
  const rule = target.rule_id ? req.rules.find((r) => r.id === target.rule_id) ?? null : null;
  const code = req.dress_code && !req.dress_code.ambiguous ? req.dress_code.value.toLowerCase() : "";
  const wantTag = FORMALITY_FOR.find(([re]) => re.test(code))?.[1] ?? null;
  const requested = req.rules.filter((r) => r.type === "colour_request").flatMap((r) => r.colours);
  const excluded = req.rules.filter((r) => r.type === "colour_exclusion").flatMap((r) => r.colours);
  const footRules = req.rules.filter((r) => (r.type === "footwear_preference" || r.type === "footwear_requirement") && r.footwear_prefer.length);
  const current = target.render_category === "shoes" ? null
    : observed?.garments.find((g) => (target.render_category === "full_body" ? ["dress", "jumpsuit", "suit"] : target.render_category === "outer" ? ["outerwear"] : ["top", "suit"]).includes(g.category)) ?? null;
  const quote = (r: Rule) => `“${r.evidence_text ?? r.summary}”`;

  return optionsFor(target, req).map((item, order) => {
    const reasons: string[] = [];
    let score = -order * 0.01; // stable: catalogue order breaks ties
    if (rule?.type === "colour_exclusion") { reasons.push(`Not ${rule.colours.map((c) => COLOUR_LABEL[c]).join(" or ")} — fits ${quote(rule)}`); score += 3; }
    else if (excluded.length) { reasons.push(`Avoids the colours you were asked not to wear`); score += 1; }
    for (const r of footRules) {
      if (item.footwear_style && r.footwear_prefer.includes(item.footwear_style)) { reasons.push(`${FOOTWEAR_LABEL[item.footwear_style][0].toUpperCase()}${FOOTWEAR_LABEL[item.footwear_style].slice(1)} — fits ${quote(r)}`); score += r.id === rule?.id ? 3 : 2; }
    }
    if (rule && ["coverage", "garment_requirement", "garment_exclusion", "other"].includes(rule.type) && meetsRule(item, rule) === true) { reasons.push(`Meets ${quote(rule)}`); score += 3; }
    const asked = item.colours.filter((c) => requested.includes(c));
    if (asked.length) { reasons.push(`${COLOUR_LABEL[asked[0]][0].toUpperCase()}${COLOUR_LABEL[asked[0]].slice(1)}, a colour the event asks for`); score += 2; }
    if (wantTag && item.formality_tags.includes(wantTag)) { reasons.push(`Suits the “${req.dress_code!.value}” dress code (WearCheck's tag: ${wantTag})`); score += 1; }
    if (item.category === "shoes" && req.venue.surface !== "unknown" && item.terrain_tags.includes(req.venue.surface)) { reasons.push(`Practical on ${req.venue.surface.replace("_", " ")}`); score += 1; }
    if (current && item.colours.includes(current.colour)) { reasons.push(`Same colour as your current ${current.category}, so the change may be subtle`); score -= 1; }
    else if (current) { reasons.push(`Different from your current ${current.colour === "other" ? "" : `${COLOUR_LABEL[current.colour]} `}${current.category}`); score += 0.5; }
    if (item.category === "shoes" && observed?.shoe_style && item.footwear_style === observed.shoe_style) { reasons.push("A similar style to the shoes you have"); score -= 1; }
    if (!reasons.length) reasons.push("Doesn't break any of your confirmed requirements");
    return { item, reasons, score };
  }).sort((a, b) => b.score - a.score);
}

/** How many reference items exist in a category at all (to state plainly when the set is small). */
export const catalogueCount = (category: RenderCategory) => CATALOGUE.filter((c) => c.enabled && c.category === category).length;

