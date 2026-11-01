/** Public, client-safe descriptions of the demo scenarios (no server imports). Images are the licensed references used. */
export const DEMO_CASES_PUBLIC = [
  {
    slug: "garden-wedding-shoes",
    tag: "Shoes · Shoes V3",
    title: "Garden wedding: heels on a lawn",
    challenge: "Formal ceremony outdoors; the host recommends flats or wedges.",
    image: "/reference/wedge-black-sandal.jpg",
    imageAlt: "Reference wedge sandal",
    imageCredit: "glitter heels, CC BY 2.0",
  },
  {
    slug: "no-white-ivory",
    tag: "Garment · Clothes V4",
    title: "“Please avoid white or ivory”",
    challenge: "A pale dress and an explicit colour request. You confirm the shade first.",
    image: "/reference/dress-navy-silk.jpg",
    imageAlt: "Reference navy cocktail dress on a dress form",
    imageCredit: "The Met, CC0",
  },
  {
    slug: "compatible-keep",
    tag: "No change · no render",
    title: "Team dinner: nothing to fix",
    challenge: "Smart casual, no restrictions. A complete result without any AI render.",
    image: null,
    imageAlt: "",
    imageCredit: null,
  },
] as { slug: string; tag: string; title: string; challenge: string; image: string | null; imageAlt: string; imageCredit: string | null }[];
