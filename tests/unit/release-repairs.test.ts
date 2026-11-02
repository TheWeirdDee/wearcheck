import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CATALOGUE, rankOptions, sameReferenceImage, meetsRule } from "@/lib/catalogue";
import fingerprints from "../../public/reference/fingerprints.json";
import { fromManual } from "@/lib/requirements";
import { assess, recheckOutcome } from "@/lib/rules";
import { ReferenceObservation, referenceProblem } from "@/lib/reference-validation";
import type { OutfitObservation, Rule } from "@/lib/schemas";

const req = (restrictions: string) => fromManual({ event_name: "Work", event_type: "work", dress_code: "", restrictions, setting: "indoor", event_date: "" });
const target = { render_category: "upper_body" as const, rule_id: null };
const observation: OutfitObservation = { person_count: "one", face_visible: true, full_body_visible: true, feet_visible: "yes", facing: "front", image_quality: "good", lighting: "good", formality_impression: "formal", rule_checks: [], unobservable: [], items: [
  { category: "top", description: "blue shirt", colour_family: "blue", colour_certainty: "clear", visibility: "clear", footwear_style: null },
  { category: "shoes", description: "trainers", colour_family: "black", colour_certainty: "clear", visibility: "clear", footwear_style: "sneaker" },
] };

describe("distinct reference provenance", () => {
  it("offers two physically distinct shirts, excludes the selected/attempted one, and honestly exhausts", () => {
    const r = req("No red");
    const first = rankOptions(target, r);
    expect(first).toHaveLength(2);
    expect(sameReferenceImage(first[0].item, first[1].item)).toBe(false);
    const next = rankOptions(target, r, undefined, [first[0].item.id]);
    expect(next.map((x) => x.item.id)).toEqual([first[1].item.id]);
    expect(rankOptions(target, r, undefined, first.map((x) => x.item.id))).toEqual([]);
  });
  it("never hides white stripes when applying a white exclusion", () => {
    expect(rankOptions(target, req("No white")).map((x) => x.item.id)).toEqual(["top-blue-shirt"]);
  });
  it("a green-and-white pattern is distinct from a solid white shirt; a solid blue shirt is not new for an observed blue shirt", () => {
    const r = req("No red");
    const observed = { garments: [{ category: "top", colour: "white" as const, description: "white shirt" }], shoe_style: null };
    expect(rankOptions(target, r, observed).map((x) => x.item.id)).toHaveLength(2);
    expect(rankOptions(target, r, { ...observed, garments: [{ ...observed.garments[0], colour: "blue", description: "blue shirt" }] }).map((x) => x.item.id)).toEqual(["top-green-seersucker"]);
  });
  it("the manifest hashes match the actual bytes sent by referenceBytes", () => {
    for (const c of CATALOGUE) {
      const expected = (fingerprints as Record<string, { sha256: string }>)[c.file];
      expect(expected).toBeDefined();
      expect(createHash("sha256").update(readFileSync(`public/reference/${c.file}`)).digest("hex")).toBe(expected.sha256);
    }
  });
  it("duplicate and near-identical source aliases are not distinct alternatives", () => {
    const a = CATALOGUE.find((x) => x.id === "top-blue-shirt")!;
    expect(sameReferenceImage(a, { ...a })).toBe(true);
    expect(sameReferenceImage(a, { ...a, file: "alternate-crop.jpg" })).toBe(true);
  });
  it("withholds worn-on-a-person catalogue references from fresh product-photo selections", () => {
    expect(rankOptions({ render_category: "shoes", rule_id: null }, req("Heels or wedges required")).map((x) => x.item.id)).not.toContain("wedge-black-sandal");
  });
  it("honours sleeve exclusion polarity", () => {
    const rule = { id: "sleeves", type: "garment_exclusion", summary: "No long sleeves", evidence_text: null, source: "user", severity: "hard", colours: [], footwear_avoid: [], footwear_prefer: [] } as Rule;
    expect(meetsRule(CATALOGUE.find((x) => x.id === "top-blue-shirt")!, rule)).toBe(false);
    expect(meetsRule(CATALOGUE.find((x) => x.id === "top-green-seersucker")!, rule)).toBe(true);
  });
});

describe("whole generated outfit", () => {
  it("a fixed shirt cannot mask a remaining shoe violation", () => {
    const result = assess(req("No white; No trainers"), observation, {}, { upper_body: true, shoes: true });
    const outcome = recheckOutcome({ rule_id: result.checks?.[0].label ?? "colour", area: "colour", render_category: "upper_body" }, result);
    expect(outcome.state).toBe("still_conflicts");
    expect(outcome.checks.map((c) => c.result)).toEqual(["ok", "issue"]);
  });
  it("optional previews recheck requirements too", () => {
    expect(recheckOutcome(null, assess(req("No trainers"), observation, {}, {})).state).toBe("still_conflicts");
    expect(recheckOutcome(null, assess(req("No red"), observation, {}, {})).state).toBe("appears_resolved");
  });
  it("no requirements and unreadable requirements never become a success", () => {
    expect(recheckOutcome(null, assess(req(""), observation, {}, {})).state).toBe("unclear");
    expect(recheckOutcome(null, assess(req("No red"), { ...observation, full_body_visible: false }, {}, {})).state).toBe("unclear");
  });
});

describe("uploaded reference admission", () => {
  const item = ReferenceObservation.parse({ category: "upper_body", single_item: true, usable_product_photo: true, colours: ["blue"], colours_clear: true, footwear_style: null, dress_code_fit: "not_provided", rule_checks: [], explanation: "One blue shirt" });
  it("accepts evidenced items and rejects conflicting, uncertain or wrong-category images", () => {
    expect(referenceProblem(item, "upper_body", req("No white"))).toBeNull();
    expect(referenceProblem({ ...item, colours: ["white"] }, "upper_body", req("No white"))).toMatch(/conflicts/);
    expect(referenceProblem({ ...item, colours_clear: false }, "upper_body", req("No white"))).toMatch(/confidently/);
    expect(referenceProblem(item, "shoes", req(""))).toMatch(/category/);
    expect(referenceProblem({ ...item, single_item: false }, "upper_body", req(""))).toMatch(/one item/);
  });
  it("withholds unknown custom suitability and missing footwear evidence", () => {
    expect(referenceProblem(item, "upper_body", req("Traditional modest attire required"))).toMatch(/not been shown/);
    expect(referenceProblem({ ...item, category: "shoes" }, "shoes", req("No trainers"))).toMatch(/not been shown/);
  });
});
