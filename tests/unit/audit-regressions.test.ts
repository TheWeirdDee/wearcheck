import { describe, expect, it } from "vitest";
import { CATALOGUE, optionsFor } from "@/lib/catalogue";
import { fromExtraction, fromManual, parseFootwear } from "@/lib/requirements";
import { assess } from "@/lib/rules";
import type { FootwearStyle, InvitationExtraction, OutfitObservation, Requirements, Rule } from "@/lib/schemas";

/** Regression cases reproduced in the independent audit of 1 November 2026 (F01–F04). */

const ALL = { shoes: true, full_body: true, upper_body: true, outer: true } as const;
type Item = OutfitObservation["items"][number];
const garment = (category: Item["category"], colour: Item["colour_family"], description: string = category): Item =>
  ({ category, description, colour_family: colour, colour_certainty: "clear", visibility: "clear", footwear_style: null });
const shoes = (style: FootwearStyle): Item =>
  ({ category: "shoes", description: style, colour_family: "black", colour_certainty: "clear", visibility: "clear", footwear_style: style });

function obs(items: Item[], over: Partial<OutfitObservation> = {}): OutfitObservation {
  return {
    person_count: "one", face_visible: true, full_body_visible: true, feet_visible: "yes", facing: "front",
    image_quality: "good", lighting: "good", items, formality_impression: "formal", rule_checks: [], unobservable: [], ...over,
  };
}
const req = (restrictions: string, over: Partial<Parameters<typeof fromManual>[0]> = {}): Requirements =>
  fromManual({ event_name: "", event_type: "wedding", dress_code: "", setting: "indoor", restrictions, event_date: "", ...over });

describe("F01 footwear prohibitions keep their polarity", () => {
  const cases: [string, FootwearStyle][] = [["No flats", "flat"], ["No wedges", "wedge"], ["No boots", "boot"], ["No trainers", "sneaker"], ["No sneakers", "sneaker"], ["No heels", "block_heel"]];
  for (const [text, worn] of cases) {
    it(`“${text}” is a hard footwear rule that avoids ${worn}`, () => {
      const [rule] = req(text).rules;
      expect(rule.type).toBe("footwear_requirement");
      expect(rule.severity).toBe("hard");
      expect(rule.footwear_avoid).toContain(worn);
      expect(rule.footwear_prefer).not.toContain(worn);
    });
    it(`wearing ${worn} under “${text}” is a conflict, never “That fits”`, () => {
      const r = assess(req(text), obs([garment("dress", "navy"), shoes(worn)]), {}, ALL);
      expect(r.status).toBe("conflict");
      expect(r.findings.some((f) => f.status === "ok" && f.area === "shoes_venue")).toBe(false);
    });
    it(`no reference offered for “${text}” is itself a prohibited style`, () => {
      const rq = req(text);
      const r = assess(rq, obs([garment("dress", "navy"), shoes(worn)]), {}, ALL);
      const key = r.findings.find((f) => f.id === r.primary_action?.finding_id)!;
      for (const item of optionsFor(key, rq)) expect(rq.rules[0].footwear_avoid).not.toContain(item.footwear_style);
    });
  }

  it("keeps polarity per clause", () => {
    expect(parseFootwear("Flats recommended, no stilettos")).toEqual({ prefer: ["flat", "flat_sandal", "loafer"], avoid: ["stiletto_heel", "kitten_heel", "heeled_sandal"] });
    expect(parseFootwear("No flats or wedges")).toEqual({ prefer: [], avoid: ["flat", "flat_sandal", "loafer", "wedge"] });
    expect(parseFootwear("Shoes must be closed-toe")).toBeNull();
  });

  it("an unrecognised footwear rule is asked about, not passed", () => {
    const rq = req("Shoes must be closed-toe");
    expect(rq.rules[0].type).toBe("other");
    const r = assess(rq, obs([garment("dress", "navy"), shoes("flat")]), {}, ALL);
    expect(r.status).toBe("insufficient");
    expect(r.clarification?.id).toMatch(/^rule:/);
  });

  it("re-reads invitation footwear wording instead of trusting the model's lists", () => {
    const x: InvitationExtraction = {
      readable: true, full_text: "Dress code: Formal. No flats please.", event_name: null, event_type: "wedding", event_date: null,
      dress_code_text: "Formal", dress_code_is_ambiguous: false, venue_setting: "indoor", venue_surface: "unknown", venue_evidence_text: null,
      rules: [{ type: "footwear_preference", summary: "Flats", evidence_text: "No flats please", wording_strength: "request", colours: [], footwear_avoid: [], footwear_prefer: ["flat"] }],
      suggestions: [], uncertainties: [],
    };
    const [rule] = fromExtraction(x).rules;
    expect(rule.footwear_avoid).toContain("flat");
    expect(rule.footwear_prefer).toEqual([]);
  });
});

describe("F02 colour rules cover every visible garment", () => {
  it("a white shirt under a navy suit conflicts with “No white or ivory”", () => {
    const r = assess(req("No white or ivory"), obs([garment("suit", "navy"), garment("top", "white", "white shirt"), shoes("loafer")]), {}, ALL);
    expect(r.status).toBe("conflict");
    const key = r.findings.find((f) => f.id === r.key_finding_id)!;
    expect(key.observation).toMatch(/white top/);
    expect(key.render_category).toBe("upper_body");
  });
  it("says so when more than one garment breaks the rule", () => {
    const r = assess(req("No white or ivory"), obs([garment("top", "white"), garment("bottom", "white"), shoes("loafer")]), {}, ALL);
    expect(r.findings.find((f) => f.id === r.key_finding_id)!.observation).toMatch(/other one would stay/);
  });
  it("asks about the specific pale garment when its colour is uncertain", () => {
    const pale = { ...garment("top", "ivory_cream"), colour_certainty: "uncertain" as const };
    const r = assess(req("No white or ivory"), obs([garment("suit", "navy"), pale, shoes("loafer")]), {}, ALL);
    expect(r.clarification?.id).toBe("colour:item1");
    const answered = assess(req("No white or ivory"), obs([garment("suit", "navy"), pale, shoes("loafer")]), { garment_colours: { item1: "white" } }, ALL);
    expect(answered.status).toBe("conflict");
  });
});

describe("F03 references must meet the rule they are meant to fix", () => {
  it("never offers the sleeveless dress for a confirmed “Sleeves required” conflict", () => {
    const rq = req("Sleeves required");
    const rule = rq.rules[0];
    const r = assess(rq, obs([garment("dress", "navy"), shoes("flat")]), { rule_answers: { [rule.id]: "applies" } }, ALL);
    const key = r.findings.find((f) => f.rule_id === rule.id)!;
    expect(key.render_category).toBe("full_body");
    expect(optionsFor(key, rq).map((c) => c.id)).not.toContain("dress-black-silk");
  });
  it("still offers the long-sleeved shirt for a top under the same rule", () => {
    const rq = req("Sleeves required");
    expect(optionsFor({ rule_id: rq.rules[0].id, render_category: "upper_body" }, rq).map((c) => c.id)).toContain("top-blue-shirt");
  });
  it("rejects items whose suitability for the rule is unknown", () => {
    const rq = req("Something traditional, please");
    const rule: Rule = rq.rules[0];
    expect(optionsFor({ rule_id: rule.id, render_category: "full_body" }, rq)).toEqual([]);
  });
  it("every catalogue garment declares coverage", () => {
    for (const c of CATALOGUE) if (c.category !== "shoes") expect(c.covers.length).toBeGreaterThan(0);
  });
});

describe("F04 a positive verdict needs a visible outfit", () => {
  it("poor photo with no garments is not compatible", () => {
    const r = assess(req("", { dress_code: "Formal" }), obs([], { image_quality: "poor", formality_impression: "unclear" }), {}, ALL);
    expect(r.status).toBe("insufficient");
    expect(r.findings[0].user_action).toBe("retake_photo");
  });
  it("distinguishes “nothing to check” from “checked and compatible”", () => {
    const none = assess(req("", { event_type: null }), obs([garment("dress", "navy"), shoes("flat")], { formality_impression: "unclear" }), {}, ALL);
    expect(none.status).toBe("no_requirements");
    expect(none.headline).toBe("No specific requirements to check");
    const checked = assess(req("No boots"), obs([garment("dress", "navy"), shoes("flat")]), {}, ALL);
    expect(checked.headline).toBe("Looks compatible with the stated requirements");
  });
});

describe("model labels never override the quoted wording", () => {
  const base: InvitationExtraction = {
    readable: true, full_text: "Dress code: Formal. Flats or wedges recommended. Please avoid white or ivory.", event_name: null, event_type: "wedding", event_date: null,
    dress_code_text: "Formal", dress_code_is_ambiguous: false, venue_setting: "outdoor", venue_surface: "grass", venue_evidence_text: null,
    rules: [], suggestions: [], uncertainties: [],
  };
  it("“Please avoid white or ivory” labelled as a colour request becomes an exclusion", () => {
    const [rule] = fromExtraction({ ...base, rules: [{ type: "colour_request", summary: "Avoid white or ivory", evidence_text: "Please avoid white or ivory", wording_strength: "request", colours: ["white", "ivory_cream"], footwear_avoid: [], footwear_prefer: [] }] }).rules;
    expect(rule.type).toBe("colour_exclusion");
    expect(rule.severity).toBe("hard");
  });
  it("a footwear suggestion keeps its styles instead of becoming an open question", () => {
    const [rule] = fromExtraction({ ...base, suggestions: [{ type: "footwear_preference", summary: "Avoid stilettos", reason: "lawn" }] }).rules;
    expect(rule.type).toBe("footwear_preference");
    expect(rule.footwear_avoid).toContain("stiletto_heel");
    const r = assess({ ...fromExtraction(base), rules: [rule] }, obs([garment("suit", "brown"), shoes("loafer")]), {}, ALL);
    expect(r.clarification).toBeNull();
  });
});

describe("cropped photos and missing requirements (November 2026 review)", () => {
  const selfie = obs([{ ...garment("top", "grey", "grey t-shirt"), visibility: "partial" }], { full_body_visible: false, feet_visible: "no", formality_impression: "casual" });

  it("a cropped selfie with zero requirements is not a compatibility verdict", () => {
    const r = assess(req("", { event_type: "celebration" }), selfie, {}, ALL);
    expect(r.status).toBe("no_requirements");
    expect(r.headline).not.toMatch(/compatible/i);
    expect(r.primary_action).toBeNull();
    expect(r.photo_request).toMatch(/head-to-toe/);
    expect(r.rows.shoes_venue.status).toBe("not_checked");
    expect(Object.values(r.rows).map((x) => x.status)).not.toContain("no_issue");
  });
  it("a cropped selfie with a dress code is “not enough information”, and asks for a suitable photo", () => {
    const r = assess(req("", { dress_code: "Formal" }), selfie, {}, ALL);
    expect(r.status).toBe("insufficient");
    expect(r.findings.some((f) => f.user_action === "retake_photo" && f.rank <= 5)).toBe(true);
    expect(r.photo_request).toMatch(/head-to-toe/);
    expect(r.primary_action).toBeNull(); // no preview until a suitable photo is supplied
    expect(r.rows.shoes_venue.status).toBe("not_checked");
  });
  it("a cropped photo still checks what it can: a visible white top under “No white” is a conflict", () => {
    const top = obs([garment("top", "white")], { full_body_visible: false, feet_visible: "no" });
    const r = assess(req("No white"), top, {}, ALL);
    expect(r.status).toBe("conflict");
    expect(r.checks?.[0].result).toBe("issue");
  });
  it("lists exactly what was checked and what wasn't", () => {
    const r = assess(req("No trainers; Avoid red", { dress_code: "Formal" }), obs([garment("suit", "brown"), garment("top", "white"), shoes("loafer")], { formality_impression: "formal" }), {}, ALL);
    expect(r.status).toBe("compatible");
    expect(r.checks?.map((c) => c.result)).toEqual(["ok", "ok", "ok"]);
    const unclear = assess(req("", { dress_code: "Formal" }), obs([garment("suit", "brown"), shoes("loafer")], { formality_impression: "unclear" }), {}, ALL);
    expect(unclear.status).toBe("insufficient"); // a requirement exists but nothing could be checked
    expect(unclear.checks?.[0].result).toBe("not_checked");
  });
  it("says which try-ons the photo supports", () => {
    const r = assess(req("", { event_type: "celebration" }), selfie, {}, ALL);
    expect(r.photo_supports?.shoes.ok).toBe(false);
    expect(r.photo_supports?.full_body.ok).toBe(false);
    expect(r.photo_supports?.upper_body.ok).toBe(true);
  });
});

