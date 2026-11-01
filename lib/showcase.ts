/**
 * Recorded YouCam outputs shown on public pages.
 * Only real provider outputs, generated through the WearCheck UI on the live deployment, from a source
 * photo whose licence permits modification and publication. Each entry says what the permission is,
 * and is labelled on the page as a recording (not a fresh call). See docs/public-assets.md.
 * The project owner's own photos and renders are private and must never be added here.
 */
export type ShowcaseExample = {
  originalSrc: string;
  previewSrc: string;
  feature: "Clothes V4" | "Shoes V3";
  recordedAt: string; // ISO time the real provider task completed
  latencySeconds: number;
  requirement: string;
  change: string;
  note: string | null;
  referenceItemId: string;
  permission: string;
};

const PERMISSION =
  "Source photo: Brooke Cagle / Unsplash, CC0 (public-domain dedication) via Wikimedia Commons. The licence permits modification and publication. No model release is on record, and the person shown has not reviewed this AI preview.";

export const SHOWCASE: ShowcaseExample[] = [
  {
    originalSrc: "/showcase/brick-wall-original.jpg",
    previewSrc: "/showcase/brick-wall-preview-loafers.jpg",
    feature: "Shoes V3",
    recordedAt: "2026-11-01T09:31:54Z",
    latencySeconds: 17,
    requirement: "“Flats or wedges recommended” for a garden ceremony",
    change: "suede ankle boots → black tassel loafers",
    note: null,
    referenceItemId: "loafer-black-tassel",
    permission: PERMISSION,
  },
  {
    originalSrc: "/showcase/brick-wall-original.jpg",
    previewSrc: "/showcase/brick-wall-preview-shirt.jpg",
    feature: "Clothes V4",
    recordedAt: "2026-11-01T09:30:56Z",
    latencySeconds: 18,
    requirement: "“Please avoid white or ivory”",
    change: "rust overshirt → blue button-down shirt",
    note: "The white T-shirt underneath is still visible in the preview — it shows the idea of a change, not a verdict.",
    referenceItemId: "top-blue-shirt",
    permission: PERMISSION,
  },
];
