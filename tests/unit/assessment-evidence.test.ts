import { describe, expect, it } from "vitest";
import { fromManual } from "@/lib/requirements";
import { assess, recheckOutcome } from "@/lib/rules";
import type { OutfitObservation } from "@/lib/schemas";

const available = { upper_body: true, outer: true, full_body: true, shoes: true };
const req = (restrictions: string, dress_code = "") => fromManual({ event_name: "", event_type: "work", dress_code, restrictions, setting: "indoor", event_date: "" });
const photo = (over: Partial<OutfitObservation> = {}): OutfitObservation => ({
  person_count: "one", face_visible: true, full_body_visible: true, feet_visible: "yes", facing: "front", image_quality: "good", lighting: "good",
  items: [
    { category: "top", description: "shirt", colour_family: "blue", colour_certainty: "clear", visibility: "clear", footwear_style: null },
    { category: "shoes", description: "loafers", colour_family: "black", colour_certainty: "clear", visibility: "clear", footwear_style: "loafer" },
  ], formality_impression: "formal", rule_checks: [], unobservable: [], ...over,
});

describe("positive decisions require complete evidence", () => {
  it("a passed shoe rule cannot mask an unassessed dress code", () => {
    const result = assess(req("No trainers", "Formal"), photo({ formality_impression: "unclear" }), {}, available);
    expect(result.status).toBe("insufficient");
    expect(result.checks?.map((c) => c.result)).toEqual(["ok", "not_checked"]);
  });
  it("an uncertain blue garment cannot pass a red exclusion", () => {
    const p = photo(); p.items[0].colour_certainty = "uncertain";
    const result = assess(req("Avoid red"), p, {}, available);
    expect(result.status).toBe("insufficient");
    expect(result.clarification?.id).toBe("colour:item0");
    expect(result.checks?.[0].result).toBe("not_checked");
  });
  it("a cropped blue top does not prove all clothing avoids white", () => {
    const result = assess(req("No white"), photo({ full_body_visible: false, feet_visible: "no" }), {}, available);
    expect(result.status).toBe("insufficient");
    expect(result.photo_request).toMatch(/head-to-toe/);
  });
  it.each([{ face_visible: false }, { facing: "back" as const }, { facing: "side" as const }])("provider input gate rejects %j while retaining assessable facts", (over) => {
    const result = assess(req("No blue"), photo(over), {}, available);
    expect(result.status).toBe("conflict");
    expect(result.primary_action).toBeNull();
    expect(Object.values(result.photo_supports!).every((s) => !s.ok)).toBe(true);
  });
  it("occluded shoes are neither checked nor offered for generation", () => {
    const p = photo(); p.items[1].visibility = "occluded";
    const result = assess(req("No trainers"), p, {}, available);
    expect(result.shoes_assessable).toBe(false);
    expect(result.status).toBe("insufficient");
    expect(result.photo_supports?.shoes.ok).toBe(false);
  });
  it("a cropped generated image cannot resolve a whole-clothing exclusion", () => {
    const after = assess(req("No white"), photo({ full_body_visible: false, feet_visible: "no" }), {}, available);
    const outcome = recheckOutcome({ rule_id: after.findings.find((f) => f.rule_id)!.rule_id, area: "colour", render_category: "upper_body" }, after);
    expect(outcome.state).toBe("unclear");
  });
});
