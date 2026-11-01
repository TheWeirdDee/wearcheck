import { RenderCategory, type ColourFamily, type FootwearStyle, type Requirements, type Finding } from "./schemas";

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

/** Filters to items that address the finding without breaking any other confirmed rule. Max 3. */
export function optionsFor(finding: Finding, req: Requirements): CatalogueItem[] {
  if (!finding.render_category) return [];
  const excluded = new Set(req.rules.filter((r) => r.type === "colour_exclusion").flatMap((r) => r.colours));
  const rule = finding.rule_id ? req.rules.find((r) => r.id === finding.rule_id) : null;
  return CATALOGUE.filter((c) => c.enabled && c.category === finding.render_category)
    .filter((c) => !c.colours.some((col) => excluded.has(col)))
    .filter((c) => {
      if (c.category !== "shoes" || !c.footwear_style) return true;
      const footRules = req.rules.filter((r) => r.type === "footwear_preference" || r.type === "footwear_requirement");
      for (const r of footRules) {
        if (r.footwear_avoid.includes(c.footwear_style)) return false;
        if (r.footwear_prefer.length && !r.footwear_prefer.includes(c.footwear_style)) return false;
      }
      if (!rule && req.venue.surface !== "unknown") return c.terrain_tags.includes(req.venue.surface) || c.terrain_tags.length === 0;
      return true;
    })
    .slice(0, 3);
}

/** Optional alternatives for a compatible outfit: allowed categories, never breaking a confirmed rule. */
export function voluntaryOptions(req: Requirements, allowed: RenderCategory[]): CatalogueItem[] {
  const picks: CatalogueItem[] = [];
  for (const category of allowed) {
    const probe = { id: "voluntary", rule_id: null, render_category: category } as Finding;
    picks.push(...optionsFor(probe, req).slice(0, 1));
  }
  return picks.slice(0, 3);
}
