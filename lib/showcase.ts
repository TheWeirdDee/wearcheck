/**
 * Verified example output shown on public pages.
 * Only populated with a real YouCam render whose source photo's subject gave permission for
 * public display; until then the landing page shows a clearly labelled illustration instead.
 * Each entry records the provider task date so it can be labelled as a recorded (not live) result.
 */
export type ShowcaseExample = {
  originalSrc: string;
  previewSrc: string;
  feature: "Clothes V4" | "Shoes V3";
  recordedAt: string; // ISO date of the real provider run
  requirement: string;
  change: string;
  referenceItemId: string;
  permission: string;
};

export const SHOWCASE: ShowcaseExample[] = [];
