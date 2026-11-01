import {
  type ColourFamily,
  type FootwearStyle,
  type InvitationExtraction,
  type ManualDetails,
  type Requirements,
  type Rule,
  COLOUR_FAMILIES,
} from "./schemas";

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

/** An evidence quote counts as "from the invitation" only if it appears in the transcribed text. */
export function isGrounded(evidence: string | null | undefined, fullText: string) {
  if (!evidence) return false;
  const e = norm(evidence).replace(/[.,;:!]+$/, "");
  return e.length >= 3 && norm(fullText).includes(e);
}

const COLOUR_WORDS: [RegExp, ColourFamily][] = [
  [/\bwhite\b/, "white"], [/\b(ivory|cream|off-white|eggshell)\b/, "ivory_cream"], [/\b(beige|nude|champagne)\b/, "beige"],
  [/\bblack\b/, "black"], [/\b(grey|gray)\b/, "grey"], [/\bnavy\b/, "navy"], [/\bblue\b/, "blue"], [/\bred\b/, "red"],
  [/\b(burgundy|wine|maroon)\b/, "burgundy"], [/\bpink\b/, "pink"], [/\bgreen\b/, "green"], [/\byellow\b/, "yellow"],
  [/\borange\b/, "orange"], [/\b(purple|lilac|lavender)\b/, "purple"], [/\bbrown\b/, "brown"], [/\bgold\b/, "gold"], [/\bsilver\b/, "silver"],
];

function coloursIn(text: string): ColourFamily[] {
  const t = norm(text);
  return COLOUR_WORDS.filter(([re]) => re.test(t)).map(([, c]) => c);
}

let seq = 0;
const ruleId = (prefix: string) => `${prefix}${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Deterministic structuring of a user's typed restrictions. Each line becomes a rule "Entered by you".
 * Only well-known patterns get structured colour/footwear fields; everything else stays as an `other` rule.
 */
export function parseRestrictionText(text: string): Rule[] {
  const rules: Rule[] = [];
  for (const raw of text.split(/\n|;|•/).map((s) => s.trim()).filter(Boolean).slice(0, 10)) {
    const t = norm(raw);
    const colours = coloursIn(t);
    const negative = /\b(no|avoid|not|don't|do not|please avoid|refrain|except)\b/.test(t);
    const footwearish = /\b(heel|heels|stiletto|flat|flats|wedge|wedges|shoe|shoes|footwear|sneaker|trainer|boots?)\b/.test(t);
    if (footwearish) {
      const prefer: FootwearStyle[] = [];
      const avoid: FootwearStyle[] = [];
      if (/\bflats?\b/.test(t)) prefer.push("flat", "flat_sandal", "loafer"); // loafers are flat shoes
      if (/\bwedges?\b/.test(t)) prefer.push("wedge");
      if (/\bblock heels?\b/.test(t)) prefer.push("block_heel");
      if (/\b(stiletto|high heels?|heels)\b/.test(t) && (negative || prefer.length > 0)) avoid.push("stiletto_heel", "kitten_heel", "heeled_sandal");
      if (/\b(sneakers?|trainers?)\b/.test(t) && negative) avoid.push("sneaker");
      const hard = /\b(must|required|mandatory|not permitted|not allowed|strictly)\b/.test(t);
      rules.push({
        id: ruleId("u"), type: hard ? "footwear_requirement" : "footwear_preference", summary: raw.slice(0, 200),
        severity: hard ? "hard" : "advisory", source: "user", evidence_text: null, colours: [],
        footwear_avoid: negative && prefer.length && !avoid.length ? [] : avoid, footwear_prefer: negative && !prefer.length ? [] : prefer,
      });
    } else if (colours.length && negative) {
      rules.push({ id: ruleId("u"), type: "colour_exclusion", summary: raw.slice(0, 200), severity: "hard", source: "user", evidence_text: null, colours, footwear_avoid: [], footwear_prefer: [] });
    } else if (colours.length) {
      rules.push({ id: ruleId("u"), type: "colour_request", summary: raw.slice(0, 200), severity: "advisory", source: "user", evidence_text: null, colours, footwear_avoid: [], footwear_prefer: [] });
    } else {
      rules.push({ id: ruleId("u"), type: "other", summary: raw.slice(0, 200), severity: negative ? "hard" : "advisory", source: "user", evidence_text: null, colours: [], footwear_avoid: [], footwear_prefer: [] });
    }
  }
  return rules;
}

const AMBIGUOUS_CODES = /\b(dress to impress|festive|chic|elevated|creative|fun|party attire|smart|dressy|whatever|come as you are)\b/;

export function fromManual(m: ManualDetails, origin: "manual" | "demo_manual" = "manual"): Requirements {
  const dress = m.dress_code.trim();
  return {
    event_name: m.event_name.trim() || null,
    event_type: m.event_type ?? null,
    event_date: m.event_date || null,
    dress_code: dress ? { value: dress, source: "user", evidence_text: null, ambiguous: AMBIGUOUS_CODES.test(norm(dress)) } : null,
    venue: { setting: m.setting, surface: "unknown", source: "user", evidence_text: null },
    rules: parseRestrictionText(m.restrictions),
    notes: [],
    no_restrictions_stated: !m.restrictions.trim(),
    uncertainties: [],
    origin,
  };
}

const validDate = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

/** Converts a validated model extraction into editable requirements, enforcing source honesty. */
export function fromExtraction(x: InvitationExtraction): Requirements {
  const rules: Rule[] = [];
  const uncertainties = [...x.uncertainties];
  for (const r of x.rules) {
    const grounded = isGrounded(r.evidence_text, x.full_text);
    const strong = r.wording_strength !== "recommendation";
    const colours = r.colours.filter((c): c is ColourFamily => (COLOUR_FAMILIES as readonly string[]).includes(c));
    if (grounded) {
      rules.push({
        id: ruleId("i"), type: r.type, summary: r.summary, severity: strong ? "hard" : "advisory", source: "invitation",
        evidence_text: r.evidence_text.trim(), colours, footwear_avoid: r.footwear_avoid, footwear_prefer: r.footwear_prefer,
      });
    } else {
      // Model claimed a rule we can't locate in the transcribed text: keep it only as a suggestion to confirm.
      rules.push({
        id: ruleId("s"), type: r.type, summary: r.summary, severity: "advisory", source: "suggested", evidence_text: null,
        colours, footwear_avoid: r.footwear_avoid, footwear_prefer: r.footwear_prefer,
      });
      uncertainties.push(`We couldn't find the exact wording for “${r.summary}” in the invitation, so it's marked as a suggestion.`);
    }
  }
  for (const s of x.suggestions) {
    rules.push({ id: ruleId("s"), type: s.type, summary: s.summary, severity: "advisory", source: "suggested", evidence_text: null, colours: [], footwear_avoid: [], footwear_prefer: [] });
  }
  const dressGrounded = isGrounded(x.dress_code_text, x.full_text);
  const venueGrounded = isGrounded(x.venue_evidence_text, x.full_text);
  return {
    event_name: x.event_name,
    event_type: x.event_type,
    event_date: validDate(x.event_date),
    dress_code: x.dress_code_text
      ? { value: x.dress_code_text, source: dressGrounded ? "invitation" : "suggested", evidence_text: dressGrounded ? x.dress_code_text : null, ambiguous: x.dress_code_is_ambiguous || AMBIGUOUS_CODES.test(norm(x.dress_code_text)) }
      : null,
    venue: {
      setting: venueGrounded ? x.venue_setting : x.venue_setting === "unknown" ? "unknown" : x.venue_setting,
      surface: x.venue_surface,
      source: venueGrounded ? "invitation" : x.venue_setting === "unknown" ? "user" : "suggested",
      evidence_text: venueGrounded ? x.venue_evidence_text : null,
    },
    rules: rules.slice(0, 20),
    notes: [],
    no_restrictions_stated: false,
    uncertainties: uncertainties.slice(0, 10),
    origin: "invitation_image",
  };
}
