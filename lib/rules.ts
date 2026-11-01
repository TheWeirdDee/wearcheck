import {
  type AssessmentResult,
  type CheckLine,
  type Clarification,
  type ColourFamily,
  type Finding,
  type FindingArea,
  type FootwearStyle,
  type ObservedOutfit,
  type OutfitObservation,
  type PhotoSupport,
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
    const none = { ok: false, reason: "The photo needs to show one person." };
    return finalize(findings, null, available, {
      shoesAssessable: false, noRequirements: false, checks: [], garmentsVisible: false, photoRequest: "Use a photo of just you, head to toe.",
      supports: { shoes: none, full_body: none, upper_body: none, outer: none }, observed: { garments: [], shoe_style: null },
    });
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
  const outdoorsSoftEarly = (req.venue.setting === "outdoor" || req.venue.setting === "mixed") && SOFT_GROUND.has(req.venue.surface);
  const noRequirements = req.rules.length === 0 && !req.dress_code && !outdoorsSoftEarly;
  // A cropped photo: say so, and make it blocking when a requirement depends on what's out of frame.
  if (garments.length > 0 && !obs.full_body_visible) {
    const needsWholeOutfit = Boolean(req.dress_code) || outdoorsSoftEarly || req.rules.some((r) => r.type !== "colour_exclusion" && r.type !== "colour_request");
    findings.push({
      id: id(), rule_id: null, area: "clothing", kind: "visibility", status: "cant_assess",
      observation: "Only part of your outfit is visible in this photo.",
      reason: "WearCheck only checks what it can see. For a full check, use a head-to-toe photo in good light, with your shoes in frame.",
      evidence_text: null, evidence_source: "photo_model", uncertainty: "Outfit partly out of frame.",
      user_action: "retake_photo", render_category: null, rank: needsWholeOutfit && !noRequirements ? 4 : 70,
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
  const outdoorsSoft = outdoorsSoftEarly;
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
        observation: style === "other" ? `Your shoes don't appear to be ${r.footwear_prefer.length ? r.footwear_prefer.filter((s) => s !== "flat_sandal" && s !== "loafer").map((s) => FOOTWEAR_LABEL[s]).join(" or ") : "an allowed style"}.` : `Your shoes appear to be ${FOOTWEAR_LABEL[style]}.`,
        reason: `${r.source === "invitation" ? `The invitation ${hard ? "requires" : "recommends"}` : `Your notes ${hard ? "require" : "recommend"}`}: “${r.evidence_text ?? r.summary}”.${outdoorsSoft ? " The venue is outdoors on a soft surface." : ""}`,
        evidence_text: r.evidence_text, evidence_source: corr.footwear_style ? "user_correction" : sourceLabel(r),
        uncertainty: shoesItem?.visibility === "clear" ? null : "Shoe style judged from a partial view.",
        user_action: shoeRenderOk ? "preview_shoes" : "none", render_category: "shoes", rank: hard ? 12 : 20,
      });
    } else {
      findings.push({
        id: id(), rule_id: r.id, area: "shoes_venue", kind: "explicit_preference", status: "ok",
        observation: style === "other"
          ? (r.footwear_avoid.length ? `Your shoes don't appear to be ${r.footwear_avoid.map((x) => FOOTWEAR_LABEL[x]).join(" or ")}.` : "Your shoes don't match a style we can name.")
          : `Your shoes appear to be ${FOOTWEAR_LABEL[style]}.`,
        reason: `That fits “${r.evidence_text ?? r.summary}”.`,
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
  let formalityNote = "";
  if (req.dress_code && !req.dress_code.ambiguous && obs.formality_impression !== "unclear") {
    const code = req.dress_code.value.toLowerCase();
    const wanted = /black tie|white tie/.test(code) ? 3 : /formal|cocktail|evening/.test(code) ? 2 : /smart|business|semi/.test(code) ? 1 : /casual/.test(code) ? 0 : null;
    const seen = { casual: 0, smart_casual: 1, formal: 2, black_tie: 3 }[obs.formality_impression];
    dressCodeChecked = wanted !== null;
    const reads = obs.formality_impression.replace("_", " ");
    formalityNote = wanted !== null && seen !== undefined && wanted - seen === 1
      ? `Reads as ${reads} in the photo — one step less formal than “${req.dress_code.value}”. Formality is subjective, so WearCheck only flags a gap of two steps or more.`
      : `Reads as ${reads} in the photo (subjective).`;
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

  // ---------- what was checked, requirement by requirement ----------
  const worst = (fs: Finding[]): CheckLine["result"] =>
    fs.some((f) => f.status === "conflict" || f.status === "consider_change") ? "issue" : fs.length && fs.every((f) => f.status === "ok") ? "ok" : "not_checked";
  const checks: CheckLine[] = req.rules.map((r) => {
    const fs = findings.filter((f) => f.rule_id === r.id);
    const result = worst(fs);
    const top = fs.find((f) => f.status !== "ok") ?? fs[0];
    return {
      label: r.evidence_text ?? r.summary, source: sourceLabel(r), result,
      note: top ? top.observation : "We couldn't check this from the photo.",
    };
  });
  if (req.dress_code) {
    const d = req.dress_code;
    const src = d.source === "invitation" ? "invitation" : d.source === "suggested" ? "suggested" : "user";
    const issue = findings.find((f) => f.kind === "style_suggestion" && f.status === "consider_change");
    checks.push(
      d.ambiguous ? { label: `Dress code: ${d.value}`, source: src, result: "not_checked", note: "Open to interpretation, so there's nothing specific to check." }
        : !dressCodeChecked ? { label: `Dress code: ${d.value}`, source: src, result: "not_checked", note: obs.formality_impression === "unclear" ? "We couldn't judge formality from this photo." : "WearCheck can't compare this dress code to a photo." }
          : issue ? { label: `Dress code: ${d.value}`, source: src, result: "issue", note: issue.observation }
            : { label: `Dress code: ${d.value}`, source: src, result: "ok", note: formalityNote },
    );
  }
  if (outdoorsSoft && footRules.length === 0) {
    const f = findings.find((x) => x.area === "shoes_venue" && x.rule_id === null);
    checks.push({
      label: `Venue: outdoors on ${req.venue.surface}`, source: req.venue.source === "invitation" ? "invitation" : "user",
      result: f ? (f.status === "consider_change" ? "issue" : "not_checked") : shoesAssessable ? "ok" : "not_checked",
      note: f ? f.observation : shoesAssessable ? "Your shoes suit soft ground." : "Shoes not visible.",
    });
  }

  // ---------- what a try-on could replace from this photo ----------
  const upperVisible = garments.some((g) => ["top", "suit", "dress", "jumpsuit", "outerwear"].includes(g.item.category));
  const supports: PhotoSupport = {
    shoes: shoesAssessable ? { ok: true, reason: "Your shoes are clearly visible." } : { ok: false, reason: obs.feet_visible === "yes" ? "Your shoes aren't clear enough in this photo." : "Your feet aren't fully in frame." },
    full_body: obs.full_body_visible && garments.length > 0 && !lowConfidenceImage ? { ok: true, reason: "Your whole outfit is visible." } : { ok: false, reason: "A full-outfit change needs a head-to-toe photo." },
    upper_body: upperVisible && !lowConfidenceImage ? { ok: true, reason: "Your top is visible." } : { ok: false, reason: "Your top isn't clearly visible." },
    outer: upperVisible && !lowConfidenceImage ? { ok: true, reason: "Your upper body is visible." } : { ok: false, reason: "Your upper body isn't clearly visible." },
  };
  const observed: ObservedOutfit = {
    garments: garments.map((g) => ({ category: g.item.category, colour: colourOf(g).colour, description: g.item.description })),
    shoe_style: shoesAssessable ? style : null,
  };
  const photoRequest = findings.find((f) => f.kind === "visibility" && f.user_action === "retake_photo")?.reason ?? null;

  return finalize(findings, clarification, available, { shoesAssessable, noRequirements, checks, garmentsVisible: garments.length > 0, photoRequest, supports, observed });
}

type Context = {
  shoesAssessable: boolean;
  noRequirements: boolean;
  checks: CheckLine[];
  garmentsVisible: boolean;
  photoRequest: string | null;
  supports: PhotoSupport;
  observed: ObservedOutfit;
};

function finalize(findings: Finding[], clarification: Clarification | null, available: RenderAvailability, ctx: Context): AssessmentResult {
  const { shoesAssessable } = ctx;
  const rankKey = (f: Finding) => {
    const statusWeight = f.status === "conflict" ? 0 : f.status === "consider_change" ? 100 : f.status === "cant_assess" ? 200 : 300;
    const feasible = f.render_category && available[f.render_category] && f.user_action !== "none" ? 0 : 5;
    return statusWeight + f.rank + feasible;
  };
  const sorted = [...findings].sort((a, b) => rankKey(a) - rankKey(b));
  const hasConflict = sorted.some((f) => f.status === "conflict");
  const hasChange = sorted.some((f) => f.status === "consider_change");
  const material = sorted.some((f) => f.status === "cant_assess" && f.rank <= 5);

  // "Compatible" needs at least one requirement actually checked; nothing supplied is its own state.
  const anyChecked = ctx.checks.some((c) => c.result === "ok");
  const status: AssessmentResult["status"] = ctx.noRequirements ? "no_requirements"
    : hasConflict ? "conflict"
      : clarification || material ? "insufficient"
        : hasChange ? "consider_change"
          : anyChecked ? "compatible" : "insufficient";

  const key = sorted.find((f) => f.status === "conflict" || f.status === "consider_change") ?? (status === "insufficient" ? sorted.find((f) => f.status === "cant_assess") : null) ?? null;
  const action = key && key.render_category && key.user_action !== "none" && key.user_action !== "retake_photo" && available[key.render_category]
    ? { finding_id: key.id, render_category: key.render_category } : null;

  const row = (area: FindingArea): AssessmentResult["rows"][FindingArea] => {
    const fs = sorted.filter((f) => f.area === area);
    // Never "No clear issue" for something that wasn't visible.
    if (area === "shoes_venue" && !shoesAssessable && fs.every((f) => f.status !== "conflict" && f.status !== "consider_change")) {
      return { status: "not_checked", summary: "Your shoes aren't visible in this photo, so they weren't checked." };
    }
    if (area === "clothing" && !ctx.garmentsVisible) return { status: "not_checked", summary: "Your clothes weren't visible enough to check." };
    if (fs.length === 0) return { status: "not_required", summary: "None of your confirmed requirements is about this." };
    const top = fs[0];
    const s = top.status === "conflict" ? "conflict" : top.status === "consider_change" ? "needs_look" : top.status === "cant_assess" ? "cant_assess" : "no_issue";
    return { status: s, summary: `${top.observation} ${top.reason}` };
  };

  const headline =
    status === "compatible" ? "Looks compatible with the stated requirements"
      : status === "no_requirements" ? "No specific requirements to check"
        : status === "consider_change" ? "One change worth considering"
          : status === "conflict" ? "Potential dress-code conflict"
            : anyChecked || clarification ? "Not enough information" : "We couldn't check your requirements from this photo";

  return {
    status,
    headline,
    key_finding_id: key?.id ?? null,
    findings: sorted,
    rows: { clothing: row("clothing"), colour: row("colour"), shoes_venue: row("shoes_venue") },
    clarification,
    shoes_assessable: shoesAssessable,
    // No preview while the photo or an answer is missing: ask for those first.
    primary_action: status === "no_requirements" || status === "insufficient" ? null : action,
    checks: ctx.checks,
    photo_request: ctx.photoRequest,
    photo_supports: ctx.supports,
    observed: ctx.observed,
  };
}

export type RecheckState = "appears_resolved" | "still_conflicts" | "unclear";

export const RECHECK_LABEL: Record<RecheckState | "none", string> = {
  appears_resolved: "AI re-read of the preview: the requirement appears to be met",
  still_conflicts: "AI re-read of the preview: still unresolved",
  unclear: "AI re-read of the preview: couldn't tell — treat as unresolved",
  none: "Not re-checked — treat as unresolved until you've checked the preview",
};

/**
 * Compares the finding a preview was made for with an assessment of the *generated image*.
 * Only the same requirement counts: a successful render is never treated as a resolved rule.
 */
export function recheckOutcome(original: Pick<Finding, "rule_id" | "area" | "render_category">, after: AssessmentResult): { state: RecheckState; note: string } {
  const same = after.findings.filter((f) => (original.rule_id ? f.rule_id === original.rule_id : f.area === original.area && f.rule_id === null));
  const bad = same.find((f) => f.status === "conflict" || f.status === "consider_change");
  if (bad) return { state: "still_conflicts", note: bad.observation };
  if (same.length && same.every((f) => f.status === "ok")) return { state: "appears_resolved", note: same[0].observation };
  if (!original.rule_id && same.length === 0 && after.status !== "insufficient") return { state: "appears_resolved", note: "No practical concern was found in the preview." };
  return { state: "unclear", note: same.find((f) => f.status === "cant_assess")?.observation ?? "The preview couldn't be read clearly enough to tell." };
}
