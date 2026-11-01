import { EDITORIAL, type EditorialImage } from "./editorial";

/**
 * Public, client-safe descriptions of the example scenarios (no server imports).
 * Images are editorial photographs that set the scene; they are not the photos the examples check.
 */
export const DEMO_CASES_PUBLIC: { slug: string; outcome: string; title: string; challenge: string; image: EditorialImage }[] = [
  {
    slug: "garden-wedding-shoes",
    outcome: "Could lead to a shoe preview",
    title: "A garden wedding, on the lawn",
    challenge: "Formal, outdoors, and the host recommends flats or wedges. Heels that sink into grass get flagged with the reason.",
    image: EDITORIAL.colonnade,
  },
  {
    slug: "no-white-ivory",
    outcome: "Could lead to a garment preview",
    title: "“Please avoid white or ivory”",
    challenge: "An explicit colour request. If your outfit looks pale, you confirm the shade before anything is called a conflict.",
    image: EDITORIAL.evening,
  },
  {
    slug: "compatible-keep",
    outcome: "Likely result: keep your outfit",
    title: "A team dinner, nothing to fix",
    challenge: "Smart casual, no restrictions. When nothing conflicts, the check ends there — no preview, nothing to buy.",
    image: EDITORIAL.street,
  },
];
