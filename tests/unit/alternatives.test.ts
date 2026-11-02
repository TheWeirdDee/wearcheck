import { describe, expect, it } from "vitest";
import { rankOptions } from "@/lib/catalogue";
import { fromManual } from "@/lib/requirements";
import { assess, recheckOutcome } from "@/lib/rules";
import type { OutfitObservation, Requirements } from "@/lib/schemas";

const ALL = { shoes: true, full_body: true, upper_body: true, outer: true } as const;
type Item = OutfitObservation["items"][number];
const g = (category: Item["category"], colour: Item["colour_family"]): Item => ({ category, description: category, colour_family: colour, colour_certainty: "clear", visibility: "clear", footwear_style: null });
const shoe = (style: Item["footwear_style"]): Item => ({ category: "shoes", description: "shoes", colour_family: "black", colour_certainty: "clear", visibility: "clear", footwear_style: style });
const obs = (items: Item[]): OutfitObservation => ({
  person_count: "one", face_visible: true, full_body_visible: true, feet_visible: "yes", facing: "front", image_quality: "good", lighting: "good",
  items, formality_impression: "formal", rule_checks: [], unobservable: [],
});
const req = (restrictions: string, over: Partial<Parameters<typeof fromManual>[0]> = {}): Requirements =>
  fromManual({ event_name: "", event_type: "wedding", dress_code: "Formal", setting: "indoor", restrictions, event_date: "", ...over });

describe("alternatives depend on the person's inputs, not a fixed category-first pick", () => {
  it("optional browsing also withholds garments whose confirmed coverage requirement cannot be verified", () => {
    const r = req("Traditional modest attire required");
    expect(rankOptions({ render_category: "upper_body", rule_id: null }, r)).toEqual([]);
    expect(rankOptions({ render_category: "full_body", rule_id: null }, r)).toEqual([]);
  });
  it("two people with different footwear requirements get different shoe choices", () => {
    const flats = req("Flats or wedges recommended", { setting: "outdoor" });
    const heels = req("Heels or wedges required");
    const a = assess(flats, obs([g("suit", "brown"), shoe("boot")]), {}, ALL);
    const b = assess(heels, obs([g("suit", "brown"), shoe("flat")]), {}, ALL);
    const fa = a.findings.find((f) => f.render_category === "shoes")!;
    const fb = b.findings.find((f) => f.render_category === "shoes")!;
    const ra = rankOptions({ render_category: "shoes", rule_id: fa.rule_id }, flats, a.observed).map((x) => x.item.id);
    const rb = rankOptions({ render_category: "shoes", rule_id: fb.rule_id }, heels, b.observed).map((x) => x.item.id);
    expect(ra).not.toEqual(rb);
    expect(ra).not.toContain("pump-nude-pointed"); // a heel never offered for "flats or wedges"
    expect(rb).not.toContain("loafer-black-tassel"); // a flat never offered for "heels or wedges required"
    expect(ra.length).toBeGreaterThan(1); // every eligible item, not just the first
  });

  it("explains each offer from the confirmed rule and the visible garment", () => {
    const r = req("Please avoid white or ivory");
    const a = assess(r, obs([g("top", "white"), shoe("loafer")]), {}, ALL);
    const f = a.findings.find((x) => x.render_category === "upper_body")!;
    const [top] = rankOptions({ render_category: "upper_body", rule_id: f.rule_id }, r, a.observed);
    expect(top.item.id).toBe("top-blue-shirt");
    expect(top.reasons.join(" ")).toMatch(/Not white or ivory \/ cream/);
    expect(top.reasons.join(" ")).toMatch(/Different from your current white top/);
  });

  it("excludes the same observed shoe style and colour", () => {
    const r = req("Flats or wedges recommended", { setting: "outdoor" });
    r.venue.surface = "grass";
    const a = assess(r, obs([g("suit", "navy"), shoe("loafer")]), {}, ALL);
    const ranked = rankOptions({ render_category: "shoes", rule_id: null }, r, a.observed);
    expect(ranked.find((x) => x.item.id === "loafer-black-tassel")).toBeUndefined();
    expect(ranked[0].item.id).not.toBe("loafer-black-tassel");
  });

  it("never uses gender or appearance: reasons only cite requirements and garments", () => {
    const r = req("Avoid red; Flats recommended");
    const a = assess(r, obs([g("dress", "red"), shoe("stiletto_heel")]), {}, ALL);
    for (const cat of ["full_body", "upper_body", "shoes"] as const) {
      for (const x of rankOptions({ render_category: cat, rule_id: null }, r, a.observed)) {
        expect(x.reasons.join(" ")).not.toMatch(/\b(women|men|woman|man|female|male|feminine|masculine|body|figure|skin)\b/i);
      }
    }
  });
});

describe("a provider success is not a resolved requirement", () => {
  const r = req("Please avoid white or ivory");
  const before = assess(r, obs([g("top", "white"), shoe("loafer")]), {}, ALL);
  const finding = before.findings.find((f) => f.status === "conflict")!;

  it("white still visible under the new shirt → still unresolved", () => {
    const after = assess(r, obs([g("top", "blue"), { ...g("top", "white"), description: "white t-shirt under the shirt" }, shoe("loafer")]), {}, ALL);
    expect(recheckOutcome(finding, after).state).toBe("still_conflicts");
  });
  it("no white clothing in the preview → appears resolved", () => {
    const after = assess(r, obs([g("top", "blue"), shoe("loafer")]), {}, ALL);
    expect(recheckOutcome(finding, after).state).toBe("appears_resolved");
  });
  it("a preview that can't be read is unclear, never resolved", () => {
    const after = assess(r, { ...obs([]), image_quality: "poor" }, {}, ALL);
    expect(recheckOutcome(finding, after).state).toBe("unclear");
  });
});
