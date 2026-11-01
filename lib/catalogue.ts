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
    id: "dress-navy-silk",
    title: "Navy ruched cocktail dress (1950s, Ceil Chapman)",
    category: "full_body",
    file: "dress-navy-silk.jpg",
    width: 1050, height: 1400,
    colours: ["navy", "blue"],
    footwear_style: null,
    tags: ["Knee length", "Deep colour"],
    formality_tags: ["formal", "cocktail"],
    terrain_tags: [],
    source_name: "The Metropolitan Museum of Art, Open Access (via Wikimedia Commons)",
    source_url: "https://commons.wikimedia.org/wiki/File:Cocktail_dress_MET_1979.424.4_F.jpg",
    creator: "Ceil Chapman (designer); photo: The Met",
    licence: "CC0 1.0",
    licence_url: "https://creativecommons.org/publicdomain/zero/1.0/",
    modifications: "Resized and padded to 3:4 by repeating edge pixels.",
    is_purchasable: false, sku: null, enabled: true,
  },
  {
    id: "dress-black-draped",
    title: "Black draped evening dress (1950s, Ceil Chapman)",
    category: "full_body",
    file: "dress-black-draped.jpg",
    width: 1050, height: 1400,
    colours: ["black"],
    footwear_style: null,
    tags: ["Long length", "Draped"],
    formality_tags: ["formal", "evening"],
    terrain_tags: [],
    source_name: "The Metropolitan Museum of Art, Open Access (via Wikimedia Commons)",
    source_url: "https://commons.wikimedia.org/wiki/File:Cocktail_dress_MET_1979.424.1_F.jpg",
    creator: "Ceil Chapman (designer); photo: The Met",
    licence: "CC0 1.0",
    licence_url: "https://creativecommons.org/publicdomain/zero/1.0/",
    modifications: "Resized and padded to 3:4 by repeating edge pixels.",
    is_purchasable: false, sku: null, enabled: true,
  },
  {
    id: "dress-burgundy-taffeta",
    title: "Burgundy taffeta cocktail dress (1950s, Ceil Chapman)",
    category: "full_body",
    file: "dress-burgundy-taffeta.jpg",
    width: 1050, height: 1400,
    colours: ["burgundy", "red"],
    footwear_style: null,
    tags: ["Knee length", "Structured"],
    formality_tags: ["formal", "cocktail"],
    terrain_tags: [],
    source_name: "The Metropolitan Museum of Art, Open Access (via Wikimedia Commons)",
    source_url: "https://commons.wikimedia.org/wiki/File:Cocktail_dress_MET_2000.366.1ab_F.jpg",
    creator: "Ceil Chapman (designer); photo: The Met",
    licence: "CC0 1.0",
    licence_url: "https://creativecommons.org/publicdomain/zero/1.0/",
    modifications: "Resized and padded to 3:4 by repeating edge pixels.",
    // Disabled after review: the photo shows a dress plus a separate bolero, and YouCam's
    // reference spec requires "a front-facing product shot of a single garment" with no composites.
    is_purchasable: false, sku: null, enabled: false,
  },
  {
    id: "jacket-plaid-wool",
    title: "Plaid tailored jacket",
    category: "outer",
    file: "jacket-plaid-wool.jpg",
    width: 999, height: 1400,
    colours: ["multicolour"],
    footwear_style: null,
    tags: ["Outer layer", "Long sleeves"],
    formality_tags: ["smart"],
    terrain_tags: [],
    source_name: "The Metropolitan Museum of Art, Open Access (via Wikimedia Commons)",
    source_url: "https://commons.wikimedia.org/wiki/File:Ensemble_MET_CI50.97.2a_F.jpg",
    creator: "Photo: The Met",
    licence: "CC0 1.0",
    licence_url: "https://creativecommons.org/publicdomain/zero/1.0/",
    modifications: "Resized and re-encoded as JPEG.",
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
