import { describe, expect, it } from "vitest";
import { fromManual } from "@/lib/requirements";
import { assess } from "@/lib/rules";
import type { OutfitObservation, Requirements } from "@/lib/schemas";

const ALL = { shoes: true, full_body: true, upper_body: true, outer: true } as const;

function obs(over: Partial<OutfitObservation> = {}): OutfitObservation {
  return {
    person_count: "one", face_visible: true, full_body_visible: true, feet_visible: "yes", facing: "front",
    image_quality: "good", lighting: "good",
    items: [
      { category: "dress", description: "knee-length dress", colour_family: "navy", colour_certainty: "clear", visibility: "clear", footwear_style: null },
      { category: "shoes", description: "pumps", colour_family: "black", colour_certainty: "clear", visibility: "clear", footwear_style: "block_heel" },
    ],
    formality_impression: "formal", rule_checks: [], unobservable: ["fabric_quality"],
    ...over,
  };
}

const req = (restrictions: string, extra: Partial<Parameters<typeof fromManual>[0]> = {}): Requirements =>
  fromManual({ event_name: "", event_type: "wedding", dress_code: "Formal", setting: "indoor", restrictions, event_date: "", ...extra });

describe("decision policy", () => {
  it("returns compatible / keep-as-is with no forced recommendation when nothing conflicts", () => {
    const r = assess(req(""), obs(), {}, ALL);
    expect(r.status).toBe("compatible");
    expect(r.primary_action).toBeNull();
    expect(r.findings.filter((f) => f.status === "conflict" || f.status === "consider_change")).toHaveLength(0);
  });

  it("asks a targeted colour question instead of asserting a conflict when the colour is uncertain", () => {
    const o = obs({ items: [{ category: "dress", description: "pale dress", colour_family: "ivory_cream", colour_certainty: "uncertain", visibility: "clear", footwear_style: null }] });
    const r = assess(req("Please avoid white or ivory"), o, {}, ALL);
    expect(r.status).toBe("insufficient");
    expect(r.clarification?.id).toBe("colour:item0");
    expect(r.findings.some((f) => f.status === "conflict")).toBe(false);
    expect(r.primary_action).toBeNull();
  });

  it("treats dim lighting as uncertain even when the model says clear", () => {
    const o = obs({ lighting: "dim", items: [{ category: "dress", description: "dress", colour_family: "white", colour_certainty: "clear", visibility: "clear", footwear_style: null }] });
    const r = assess(req("No white"), o, {}, ALL);
    expect(r.status).toBe("insufficient");
  });

  it("reports a hard conflict only once the user confirms the prohibited colour", () => {
    const o = obs({ items: [{ category: "dress", description: "pale dress", colour_family: "ivory_cream", colour_certainty: "uncertain", visibility: "clear", footwear_style: null }] });
    const r = assess(req("Please avoid white or ivory"), o, { main_garment_colour: "ivory_cream" }, ALL);
    expect(r.status).toBe("conflict");
    expect(r.primary_action?.render_category).toBe("full_body");
    const key = r.findings.find((f) => f.id === r.key_finding_id)!;
    expect(key.evidence_source).toBe("user_correction");
  });

  it("treats a footwear recommendation as consider-change, not a violation", () => {
    const o = obs({ items: [obs().items[0], { category: "shoes", description: "stilettos", colour_family: "black", colour_certainty: "clear", visibility: "clear", footwear_style: "stiletto_heel" }] });
    const r = assess(req("Flats or wedges recommended", { setting: "outdoor" }), o, {}, ALL);
    expect(r.status).toBe("consider_change");
    expect(r.primary_action?.render_category).toBe("shoes");
    expect(r.findings[0].kind).toBe("explicit_preference");
  });

  it("never offers a shoe preview when feet are not visible", () => {
    const o = obs({ feet_visible: "no", items: [obs().items[0]] });
    const r = assess(req("Flats or wedges recommended", { setting: "outdoor" }), o, {}, ALL);
    expect(r.shoes_assessable).toBe(false);
    expect(r.primary_action).toBeNull();
    expect(r.rows.shoes_venue.status).toBe("cant_assess");
  });

  it("labels venue-only concerns as practical, never as an event rule", () => {
    const base = req("", { setting: "outdoor" });
    base.venue.surface = "grass";
    const o = obs({ items: [obs().items[0], { category: "shoes", description: "stilettos", colour_family: "black", colour_certainty: "clear", visibility: "clear", footwear_style: "stiletto_heel" }] });
    const r = assess(base, o, {}, ALL);
    const f = r.findings.find((x) => x.area === "shoes_venue")!;
    expect(f.kind).toBe("practical");
    expect(f.reason).toMatch(/isn't an event rule/);
  });

  it("does not invent hard rules from an ambiguous dress code", () => {
    const r = assess(req("", { dress_code: "Dress to impress" }), obs({ formality_impression: "casual" }), {}, ALL);
    expect(r.findings.some((f) => f.status === "conflict")).toBe(false);
    expect(r.findings.some((f) => /open to interpretation/.test(f.observation))).toBe(true);
  });

  it("rejects multi-person photos as insufficient", () => {
    const r = assess(req(""), obs({ person_count: "multiple" }), {}, ALL);
    expect(r.status).toBe("insufficient");
    expect(r.primary_action).toBeNull();
  });

  it("asks the user about free-text rules instead of guessing", () => {
    const rq = req("No jeans");
    const o = obs({ rule_checks: [{ rule_id: rq.rules[0].id, assessment: "may_conflict", explanation: "Trousers look like denim" }] });
    const r = assess(rq, o, {}, ALL);
    expect(r.clarification?.id).toBe(`rule:${rq.rules[0].id}`);
    expect(r.findings.some((f) => f.status === "conflict")).toBe(false);
    const confirmed = assess(rq, o, { rule_answers: { [rq.rules[0].id]: "applies" } }, ALL);
    expect(confirmed.status).toBe("conflict");
  });

  it("does not offer a render when no reference category is available", () => {
    const o = obs({ items: [obs().items[0], { category: "shoes", description: "stilettos", colour_family: "black", colour_certainty: "clear", visibility: "clear", footwear_style: "stiletto_heel" }] });
    const r = assess(req("Flats recommended", { setting: "outdoor" }), o, {}, { full_body: true });
    expect(r.status).toBe("consider_change");
    expect(r.primary_action).toBeNull();
  });
});
