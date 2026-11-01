import {
  type AssessmentResult,
  type Clarification,
  type ColourFamily,
  type Finding,
  type FindingArea,
  type FootwearStyle,
  type OutfitObservation,
  type RenderCategory,
  type Requirements,
  type Rule,
  type UserCorrections,
  COLOUR_LABEL,
  FOOTWEAR_LABEL,
} from "./schemas";

/**
 * Deterministic decision policy (PRD §8.4). The vision model only supplies observations;
 * this typed logic decides status, priority and which actions are eligible.
 */

const MAIN_GARMENT_ORDER = ["dress", "jumpsuit", "suit", "top", "outerwear", "bottom"] as const;
const CLOTHING = new Set<string>(MAIN_GARMENT_ORDER);
const NARROW_HEELS: FootwearStyle[] = ["stiletto_heel", "kitten_heel", "heeled_sandal"];
const SOFT_GROUND = new Set(["grass", "sand", "gravel", "cobblestone"]);
const PALE: ColourFamily[] = ["white", "ivory_cream", "beige", "silver", "gold"];

export type RenderAvailability = Partial<Record<RenderCategory, boolean>>;

function garmentRenderCategory(cat: string): RenderCategory | null {
  if (cat === "dress" || cat === "jumpsuit") return "full_body";
  if (cat === "top" || cat === "suit") return "upper_body";
  if (cat === "outerwear") return "outer";
  return null; // lower-body references need a worn-outfit photo; not offered from the catalogue
}

const sourceLabel = (r: Rule) => (r.source === "invitation" ? "invitation" : r.source === "user" ? "user" : "suggested");

export function assess(
  req: Requirements,
  obs: OutfitObservation,
  corr: UserCorrections,
  available: RenderAvailability,
): AssessmentResult {
  const findings: Finding[] = [];
  let clarification: Clarification | null = null;
  let n = 0;
  const id = () => `f${++n}`;

  // ---------- 0. photo usability ----------
  if (obs.person_count !== "one") {
    const msg = obs.person_count === "multiple" ? "More than one person appears in this photo." : "We couldn't clearly see one person in this photo.";
    findings.push({
      id: id(), rule_id: null, area: "clothing", kind: "visibility", status: "cant_assess", observation: msg,
      reason: "WearCheck checks one consenting adult per photo.", evidence_text: null, evidence_source: "photo_model",
      uncertainty: null, user_action: "retake_photo", render_category: null, rank: 0,
    });
    return finalize(findings, null, false, available);
  }
  const lowConfidenceImage = obs.image_quality === "poor";
  const items = obs.items;
  const garments = items
    .map((item, index) => ({ item, index }))
    .filter((g) => CLOTHING.has(g.item.category))
    .sort((a, b) => MAIN_GARMENT_ORDER.indexOf(a.item.category as never) - MAIN_GARMENT_ORDER.indexOf(b.item.category as never));

  // A positive verdict needs a usable view of the clothes: no garments or a poor photo is "not enough information".
  if (lowConfidenceImage || garments.length === 0) {
    findings.push({
      id: id(), rule_id: null, area: "clothing", kind: "visibility", status: "cant_assess",
      observation: garments.length === 0 ? "We couldn't make out your clothes in this photo." : "This photo is too unclear to check your outfit reliably.",
      reason: "WearCheck only gives a verdict on clothing it can see. Try a brighter, full-length photo, or correct the details yourself.",
      evidence_text: null, evidence_source: "photo_model", uncertainty: "Outfit not clearly visible.",
      user_action: "retake_photo", render_category: null, rank: 2,
    });
  }

  // ---------- main garment & colour ----------
  const main = garments[0]?.item ?? null;
  const userColour = corr.main_garment_colour;
  const mainColour: ColourFamily | null = userColour ?? main?.colour_family ?? null;
  const colourConfirmed = Boolean(userColour);
  const colourLighting = obs.lighting === "good" && obs.image_quality !== "poor";
  const colourClear = colourConfirmed || (main?.colour_certainty === "clear" && main?.visibility === "clear" && colourLighting);
  const mainCategory = main ? garmentRenderCategory(main.category) : null;

  // ---------- 1/2. explicit colour rules (hard first): every visible garment, not only the main one ----------
  const colourOf = (g: (typeof garments)[number]) => {
    const corrected = corr.garment_colours?.[`item${g.index}`] ?? (g.item === main ? userColour : undefined);
    const colour = corrected ?? g.item.colour_family;
    const clear = Boolean(corrected) || (g.item.colour_certainty === "clear" && g.item.visibility === "clear" && colourLighting);
    return { colour, confirmed: Boolean(corrected), clear };
  };
  const garmentName = (g: (typeof garments)[number]) => (g.item.category === "bottom" ? "trousers or skirt" : g.item.category);
  const colourRules = req.rules.filter((r) => r.type === "colour_exclusion" && r.colours.length);
  for (const r of colourRules) {
    const quote = r.evidence_text ?? r.summary;
    if (garments.length === 0) {
      findings.push({
        id: id(), rule_id: r.id, area: "colour", kind: "visibility", status: "cant_assess",
        observation: "We couldn't identify your clothes clearly.", reason: `The event asks: “${quote}”.`,
        evidence_text: r.evidence_text, evidence_source: sourceLabel(r), uncertainty: "Clothing not clearly visible.",
        user_action: "retake_photo", render_category: null, rank: 1,
      });
      continue;
    }
    const seen = garments.map((g) => ({ g, ...colourOf(g) }));
    const hits = seen.filter((x) => r.colours.includes(x.colour));
    const near = seen.filter((x) => !r.colours.includes(x.colour) && PALE.includes(x.colour) && r.colours.some((c) => PALE.includes(c)));
    const clearHits = hits.filter((x) => x.clear);
    const unsure = [...hits, ...near].filter((x) => !x.clear);

    if (clearHits.length) {
      const hard = r.severity === "hard" && r.source !== "suggested";
      // Prefer a garment a preview can actually replace.
      const target = clearHits.find((x) => garmentRenderCategory(x.g.item.category)) ?? clearHits[0];
      const cat = garmentRenderCategory(target.g.item.category);
      const named = clearHits.map((x) => `a ${COLOUR_LABEL[x.colour]} ${garmentName(x.g)}`);
      const rest = clearHits.length > 1 ? ` A preview changes one garment at a time, so the other ${clearHits.length === 2 ? "one" : "ones"} would stay.` : "";
      findings.push({
        id: id(), rule_id: r.id, area: "colour", kind: hard ? "explicit_rule" : "explicit_preference",
        status: hard ? "conflict" : "consider_change",
        observation: `${target.confirmed ? "You confirmed" : "Your photo shows"} ${named.join(" and ")}.${rest}`,
        reason: `${r.source === "invitation" ? "The invitation says" : "You noted"}: “${quote}”. This covers all visible clothing, not only the main piece.`,
        evidence_text: r.evidence_text, evidence_source: target.confirmed ? "user_correction" : sourceLabel(r), uncertainty: null,
        user_action: cat && available[cat] ? "preview_garment" : "none", render_category: cat, rank: hard ? 10 : 30,
      });
    } else if (unsure.length) {
      // Respect uncertainty: ask before any confident verdict.
      const x = unsure[0];
      if (!clarification) {
        const opts = Array.from(new Set<ColourFamily>([...r.colours, x.colour, "beige", "grey", "other"]));
        clarification = {
          id: `colour:item${x.g.index}`,
          question: `Is your ${garmentName(x.g)} ${opts.filter((c) => c !== "other").slice(0, 3).map((c) => COLOUR_LABEL[c]).join(", ")} or another shade?`,
          options: opts.map((c) => ({ value: c, label: c === "other" ? "Another colour" : COLOUR_LABEL[c] })),
        };
      }
      findings.push({
        id: id(), rule_id: r.id, area: "colour", kind: "explicit_rule", status: "cant_assess",
        observation: `Your ${garmentName(x.g)} looks pale, but photos can shift colour${colourLighting ? "" : " — especially in this lighting"}.`,
        reason: `The event asks: “${quote}”. We need you to confirm the colour before saying anything definite.`,
        evidence_text: r.evidence_text, evidence_source: sourceLabel(r), uncertainty: "Garment colour from a photo is uncertain.",
        user_action: "none", render_category: null, rank: 1,
      });
    } else {
      findings.push({
        id: id(), rule_id: r.id, area: "colour", kind: "explicit_rule", status: "ok",
        observation: `None of your visible clothing appears ${r.colours.map((c) => COLOUR_LABEL[c]).join(" or ")} (${seen.map((x) => `${garmentName(x.g)}: ${COLOUR_LABEL[x.colour]}`).join(", ")}).`,
        reason: `That fits “${quote}”.`,
        evidence_text: r.evidence_text, evidence_source: seen.some((x) => x.confirmed) ? "user_correction" : "photo_model",
        uncertainty: seen.every((x) => x.clear) ? null : "Colour judged from the photo.", user_action: "none", render_category: null, rank: 90,
      });
    }
  }
  for (const r of req.rules.filter((r) => r.type === "colour_request" && r.colours.length)) {
    if (!main || !mainColour) continue;
    const matches = r.colours.includes(mainColour);
    findings.push({
      id: id(), rule_id: r.id, area: "colour", kind: "explicit_preference", status: matches || !colourClear ? "ok" : "consider_change",
      observation: `Your ${main.category} appears ${COLOUR_LABEL[mainColour]}.`, reason: `The event mentions: “${r.evidence_text ?? r.summary}”. This is a request, not a strict rule.`,
      evidence_text: r.evidence_text, evidence_source: sourceLabel(r), uncertainty: colourClear ? null : "Colour judged from the photo.",
      user_action: !matches && mainCategory && available[mainCategory] ? "preview_garment" : "none", render_category: !matches ? mainCategory : null, rank: 40,
    });
  }

  // ---------- footwear ----------
  const shoesItem = items.find((i) => i.category === "shoes") ?? null;
  const shoesAssessable = obs.feet_visible === "yes" && obs.full_body_visible && Boolean(shoesItem) && !lowConfidenceImage;
  const style: FootwearStyle | null = corr.footwear_style ?? shoesItem?.footwear_style ?? null;
  // A footwear rule without a recognised style can't be checked mechanically; it's asked about below instead.
  const isFoot = (r: Rule) => r.type === "footwear_preference" || r.type === "footwear_requirement";
  const footRules = req.rules.filter((r) => isFoot(r) && (r.footwear_avoid.length > 0 || r.footwear_prefer.length > 0));
  const outdoorsSoft = (req.venue.setting === "outdoor" || req.venue.setting === "mixed") && SOFT_GROUND.has(req.venue.surface);
  const shoeRenderOk = Boolean(available.shoes) && obs.face_visible;

  for (const r of footRules) {
    if (!shoesAssessable || !style) {
      findings.push({
        id: id(), rule_id: r.id, area: "shoes_venue", kind: "visibility", status: "cant_assess",
        observation: obs.feet_visible === "yes" ? "We couldn't make out your shoes clearly." : "Your feet aren't fully visible in this photo.",
        reason: `The event mentions footwear: “${r.evidence_text ?? r.summary}”. We won't evaluate or preview shoes from this photo.`,
        evidence_text: r.evidence_text, evidence_source: sourceLabel(r), uncertainty: "Shoes not visible.", user_action: "retake_photo", render_category: null, rank: 5,
      });
      continue;
    }
    const avoided = r.footwear_avoid.includes(style);
    const notPreferred = r.footwear_prefer.length > 0 && !r.footwear_prefer.includes(style);
    if (avoided || notPreferred) {
      const hard = (r.type === "footwear_requirement" || avoided) && r.severity === "hard" && r.source !== "suggested" && (shoesItem?.visibility === "clear" || Boolean(corr.footwear_style));
      findings.push({
        id: id(), rule_id: r.id, area: "shoes_venue", kind: hard ? "explicit_rule" : "explicit_preference", status: hard ? "conflict" : "consider_change",
        observation: `Your shoes appear to be ${FOOTWEAR_LABEL[style]}.`,
        reason: `${r.source === "invitation" ? `The invitation ${hard ? "requires" : "recommends"}` : `Your notes ${hard ? "require" : "recommend"}`}: “${r.evidence_text ?? r.summary}”.${outdoorsSoft ? " The venue is outdoors on a soft surface." : ""}`,
        evidence_text: r.evidence_text, evidence_source: corr.footwear_style ? "user_correction" : sourceLabel(r),
        uncertainty: shoesItem?.visibility === "clear" ? null : "Shoe style judged from a partial view.",
        user_action: shoeRenderOk ? "preview_shoes" : "none", render_category: "shoes", rank: hard ? 12 : 20,
      });
    } else {
      findings.push({
        id: id(), rule_id: r.id, area: "shoes_venue", kind: "explicit_preference", status: "ok",
        observation: `Your shoes appear to be ${FOOTWEAR_LABEL[style]}.`, reason: `That fits “${r.evidence_text ?? r.summary}”.`,
        evidence_text: r.evidence_text, evidence_source: "photo_model", uncertainty: null, user_action: "none", render_category: null, rank: 90,
      });
    }
  }
  // Practical venue consideration — never labelled an event rule.
  if (footRules.length === 0 && outdoorsSoft) {
    if (shoesAssessable && style && NARROW_HEELS.includes(style)) {
      findings.push({
        id: id(), rule_id: null, area: "shoes_venue", kind: "practical", status: "consider_change",
        observation: `Your shoes appear to be ${FOOTWEAR_LABEL[style]}.`,
        reason: `Practical consideration: the venue is outdoors on ${req.venue.surface}, where narrow heels can sink. This isn't an event rule.`,
        evidence_text: req.venue.evidence_text, evidence_source: req.venue.source === "invitation" ? "invitation" : "user",
        uncertainty: null, user_action: shoeRenderOk ? "preview_shoes" : "none", render_category: "shoes", rank: 50,
      });
    } else if (!shoesAssessable) {
      findings.push({
        id: id(), rule_id: null, area: "shoes_venue", kind: "visibility", status: "cant_assess",
        observation: "Your shoes aren't fully visible.", reason: `The venue is outdoors on ${req.venue.surface}. Include your feet if you'd like a shoe check.`,
        evidence_text: null, evidence_source: "photo_model", uncertainty: "Shoes not visible.", user_action: "retake_photo", render_category: null, rank: 80,
      });
    }
  }

  // ---------- other explicit rules (garment/coverage/free text): model notes, never auto-conflict ----------
  const openRules = req.rules.filter((r) => ["garment_exclusion", "garment_requirement", "coverage", "other"].includes(r.type) || (isFoot(r) && !footRules.includes(r)));
  for (const r of openRules) {
    const answer = corr.rule_answers?.[r.id];
    const check = obs.rule_checks.find((c) => c.rule_id === r.id);
    if (answer === "applies") {
      const hard = r.severity === "hard" && r.source !== "suggested";
      findings.push({
        id: id(), rule_id: r.id, area: "clothing", kind: hard ? "explicit_rule" : "explicit_preference", status: hard ? "conflict" : "consider_change",
        observation: "You confirmed this applies to your outfit.", reason: `${r.source === "invitation" ? "The invitation says" : "You noted"}: “${r.evidence_text ?? r.summary}”.`,
        evidence_text: r.evidence_text, evidence_source: "user_correction", uncertainty: null,
        user_action: mainCategory && available[mainCategory] ? "preview_garment" : "none", render_category: mainCategory, rank: hard ? 14 : 35,
      });
    } else if (answer === "does_not_apply" || check?.assessment === "appears_consistent") {
      findings.push({
        id: id(), rule_id: r.id, area: "clothing", kind: "explicit_rule", status: "ok",
        observation: answer ? "You confirmed this doesn't apply." : (check?.explanation ?? "Nothing in the photo appears to conflict."),
        reason: `Checked against “${r.evidence_text ?? r.summary}”.`, evidence_text: r.evidence_text,
        evidence_source: answer ? "user_correction" : "photo_model", uncertainty: answer ? null : "Based on what's visible in the photo.",
        user_action: "none", render_category: null, rank: 90,
      });
    } else {
      // may_conflict or cannot_tell → ask the user, don't assert.
      if (!clarification) {
        clarification = {
          id: `rule:${r.id}`,
          question: `Does this apply to your outfit: “${r.evidence_text ?? r.summary}”?`,
          options: [{ value: "applies", label: "Yes, it does" }, { value: "does_not_apply", label: "No, it doesn't" }],
        };
      }
      findings.push({
        id: id(), rule_id: r.id, area: "clothing", kind: "explicit_rule", status: "cant_assess",
        observation: check?.explanation ?? "We can't tell from the photo.", reason: `The event says: “${r.evidence_text ?? r.summary}”. Please confirm.`,
        evidence_text: r.evidence_text, evidence_source: sourceLabel(r), uncertainty: "Needs your confirmation.", user_action: "none", render_category: null, rank: 3,
      });
    }
  }

  // ---------- subjective formality: "may not match", never a violation ----------
  let dressCodeChecked = false;
  if (req.dress_code && !req.dress_code.ambiguous && obs.formality_impression !== "unclear") {
    const code = req.dress_code.value.toLowerCase();
    const wanted = /black tie|white tie/.test(code) ? 3 : /formal|cocktail|evening/.test(code) ? 2 : /smart|business|semi/.test(code) ? 1 : /casual/.test(code) ? 0 : null;
    const seen = { casual: 0, smart_casual: 1, formal: 2, black_tie: 3 }[obs.formality_impression];
    dressCodeChecked = wanted !== null;
    if (wanted !== null && seen !== undefined && wanted - seen >= 2) {
      findings.push({
        id: id(), rule_id: null, area: "clothing", kind: "style_suggestion", status: "consider_change",
        observation: "Your outfit may read as more relaxed than the stated dress code.",
        reason: `The dress code is “${req.dress_code.value}”. Formality is subjective and varies by culture and host, so treat this as a suggestion, not a rule.`,
        evidence_text: req.dress_code.evidence_text, evidence_source: req.dress_code.source === "invitation" ? "invitation" : "user",
        uncertainty: "Formality judged from the photo.", user_action: mainCategory && available[mainCategory] ? "preview_garment" : "none", render_category: mainCategory, rank: 60,
      });
    }
  }
  if (req.dress_code?.ambiguous) {
    findings.push({
      id: id(), rule_id: null, area: "clothing", kind: "style_suggestion", status: "ok",
      observation: "The dress code is open to interpretation.", reason: `“${req.dress_code.value}” doesn't define specific clothing. We haven't invented rules for it; your host's guidance wins.`,
      evidence_text: req.dress_code.evidence_text, evidence_source: req.dress_code.source === "invitation" ? "invitation" : "user",
      uncertainty: "Ambiguous wording.", user_action: "none", render_category: null, rank: 95,
    });
  }

  // Footwear clarification when shoes are visible but the style is uncertain and a footwear rule depends on it.
  if (!clarification && footRules.length && shoesAssessable && !style) {
    clarification = { id: "footwear_style", question: "What kind of shoes are you wearing?", options: (["stiletto_heel", "block_heel", "wedge", "flat", "flat_sandal", "heeled_sandal", "sneaker", "boot", "loafer"] as FootwearStyle[]).map((s) => ({ value: s, label: FOOTWEAR_LABEL[s] })) };
  }

  // "Nothing to check" is not the same as "checked and compatible".
  const checkedSomething = req.rules.length > 0 || dressCodeChecked || outdoorsSoft;
  return finalize(findings, clarification, shoesAssessable, available, checkedSomething);
}

function finalize(findings: Finding[], clarification: Clarification | null, shoesAssessable: boolean, available: RenderAvailability, checkedSomething = true): AssessmentResult {
  const rankKey = (f: Finding) => {
    const statusWeight = f.status === "conflict" ? 0 : f.status === "consider_change" ? 100 : f.status === "cant_assess" ? 200 : 300;
    const feasible = f.render_category && available[f.render_category] && f.user_action !== "none" ? 0 : 5;
    return statusWeight + f.rank + feasible;
  };
  const sorted = [...findings].sort((a, b) => rankKey(a) - rankKey(b));
  const hasConflict = sorted.some((f) => f.status === "conflict");
  const hasChange = sorted.some((f) => f.status === "consider_change");
  const material = sorted.some((f) => f.status === "cant_assess" && f.rank <= 5);

  const status: AssessmentResult["status"] = hasConflict ? "conflict"
    : clarification || material ? "insufficient"
      : hasChange ? "consider_change" : "compatible";

  const key = sorted.find((f) => f.status === "conflict" || f.status === "consider_change") ?? (status === "insufficient" ? sorted.find((f) => f.status === "cant_assess") : null) ?? null;
  const action = key && key.render_category && key.user_action !== "none" && key.user_action !== "retake_photo" && available[key.render_category]
    ? { finding_id: key.id, render_category: key.render_category } : null;

  const row = (area: FindingArea) => {
    const fs = sorted.filter((f) => f.area === area);
    if (fs.length === 0) return { status: "no_issue" as const, summary: area === "shoes_venue" && !shoesAssessable ? "Shoes weren't checked — they aren't fully visible." : "Nothing in your confirmed requirements applies here." };
    const top = fs[0];
    const s = top.status === "conflict" ? "conflict" : top.status === "consider_change" ? "needs_look" : top.status === "cant_assess" ? "cant_assess" : "no_issue";
    return { status: s as "no_issue" | "needs_look" | "conflict" | "cant_assess", summary: `${top.observation} ${top.reason}` };
  };

  const headline =
    status === "compatible" ? (checkedSomething ? "Looks compatible with the stated requirements" : "No specific requirements to check against")
      : status === "consider_change" ? "One change worth considering"
        : status === "conflict" ? "Potential dress-code conflict"
          : "Not enough information";

  return {
    status,
    headline,
    key_finding_id: key?.id ?? null,
    findings: sorted,
    rows: { clothing: row("clothing"), colour: row("colour"), shoes_venue: row("shoes_venue") },
    clarification,
    shoes_assessable: shoesAssessable,
    primary_action: status === "insufficient" && clarification ? null : action,
  };
}
