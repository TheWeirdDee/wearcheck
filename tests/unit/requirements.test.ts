import { describe, expect, it } from "vitest";
import { fromExtraction, fromManual, isGrounded, parseRestrictionText } from "@/lib/requirements";
import { Requirements, Rule, type InvitationExtraction } from "@/lib/schemas";

const extraction = (over: Partial<InvitationExtraction> = {}): InvitationExtraction => ({
  readable: true,
  full_text: "Sam & Alex are getting married. Garden ceremony on the lawn. Dress code: Formal. Flats or wedges recommended. Please avoid white or ivory.",
  event_name: "Sam & Alex's wedding", event_type: "wedding", event_date: "2026-12-05",
  dress_code_text: "Formal", dress_code_is_ambiguous: false,
  venue_setting: "outdoor", venue_surface: "grass", venue_evidence_text: "Garden ceremony on the lawn",
  rules: [
    { type: "footwear_preference", summary: "Flats or wedges recommended", evidence_text: "Flats or wedges recommended", wording_strength: "recommendation", colours: [], footwear_avoid: [], footwear_prefer: ["flat", "wedge"] },
    { type: "colour_exclusion", summary: "Avoid white or ivory", evidence_text: "Please avoid white or ivory", wording_strength: "request", colours: ["white", "ivory_cream"], footwear_avoid: [], footwear_prefer: [] },
  ],
  suggestions: [{ type: "other", summary: "Bring a layer for the evening", reason: "Outdoor" }],
  uncertainties: [],
  ...over,
});

describe("source honesty", () => {
  it("keeps grounded rules as 'From invitation' with exact text", () => {
    const r = fromExtraction(extraction());
    const inv = r.rules.filter((x) => x.source === "invitation");
    expect(inv).toHaveLength(2);
    expect(inv.every((x) => x.evidence_text && isGrounded(x.evidence_text, extraction().full_text))).toBe(true);
    expect(inv.find((x) => x.type === "colour_exclusion")!.severity).toBe("hard");
    expect(inv.find((x) => x.type === "footwear_preference")!.severity).toBe("advisory");
  });

  it("downgrades a rule whose quote isn't in the transcription to a suggestion", () => {
    const x = extraction({ rules: [{ type: "colour_exclusion", summary: "No red", evidence_text: "Absolutely no red", wording_strength: "requirement", colours: ["red"], footwear_avoid: [], footwear_prefer: [] }] });
    const r = fromExtraction(x);
    expect(r.rules[0].source).toBe("suggested");
    expect(r.rules[0].severity).toBe("advisory");
    expect(r.rules[0].evidence_text).toBeNull();
    expect(r.uncertainties.length).toBeGreaterThan(0);
  });

  it("model suggestions are never invitation rules", () => {
    const r = fromExtraction(extraction());
    const s = r.rules.filter((x) => x.summary.startsWith("Bring a layer"));
    expect(s[0].source).toBe("suggested");
  });

  it("schema rejects an invitation rule without source text and a hard suggestion", () => {
    expect(Rule.safeParse({ id: "a", type: "other", summary: "x", severity: "hard", source: "invitation", evidence_text: null }).success).toBe(false);
    expect(Rule.safeParse({ id: "a", type: "other", summary: "x", severity: "hard", source: "suggested", evidence_text: null }).success).toBe(false);
  });

  it("schema rejects unknown severity and unsupported rule types", () => {
    expect(Rule.safeParse({ id: "a", type: "other", summary: "x", severity: "mandatory", source: "user", evidence_text: null }).success).toBe(false);
    expect(Rule.safeParse({ id: "a", type: "hat_rule", summary: "x", severity: "hard", source: "user", evidence_text: null }).success).toBe(false);
  });

  it("produces schema-valid requirements from both paths", () => {
    expect(Requirements.safeParse(fromExtraction(extraction())).success).toBe(true);
    expect(Requirements.safeParse(fromManual({ event_name: "", event_type: null, dress_code: "", setting: "unknown", restrictions: "", event_date: "" })).success).toBe(true);
  });
});

describe("manual restriction parsing", () => {
  it("structures common colour and footwear wording", () => {
    const [c, f] = parseRestrictionText("Please avoid white or ivory\nCeremony on the lawn — flats or wedges recommended");
    expect(c.type).toBe("colour_exclusion");
    expect(c.colours).toEqual(expect.arrayContaining(["white", "ivory_cream"]));
    expect(c.source).toBe("user");
    expect(f.type).toBe("footwear_preference");
    expect(f.footwear_prefer).toEqual(expect.arrayContaining(["flat", "wedge"]));
  });

  it("marks ambiguous dress codes", () => {
    const r = fromManual({ event_name: "", event_type: "celebration", dress_code: "Festive chic", setting: "indoor", restrictions: "", event_date: "" });
    expect(r.dress_code?.ambiguous).toBe(true);
    expect(r.no_restrictions_stated).toBe(true);
  });
});
