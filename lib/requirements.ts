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

/** Footwear words people type, singular and plural, mapped to the styles they name. */
const FOOTWEAR_WORDS: [RegExp, FootwearStyle[]][] = [
  [/\bblock[- ]heel(ed|s)?\b/, ["block_heel"]],
  [/\bkitten heels?\b/, ["kitten_heel"]],
  [/\b(stilettos?|high heels?|narrow heels?|pencil heels?|spike heels?)\b/, ["stiletto_heel", "kitten_heel", "heeled_sandal"]],
  [/\b(heels|heeled shoes)\b/, ["stiletto_heel", "kitten_heel", "heeled_sandal", "block_heel"]],
  [/\bheeled sandals?\b/, ["heeled_sandal"]],
  [/\b(flat sandals?|sandals?|slides?|flip[- ]flops?)\b/, ["flat_sandal"]],
  [/\b(flats|flat shoes?|ballet flats?|ballerinas?)\b/, ["flat", "flat_sandal", "loafer"]], // loafers are flat shoes
  [/\bwedges?\b/, ["wedge"]],
  [/\b(sneakers?|trainers?|running shoes?|tennis shoes?)\b/, ["sneaker"]],
  [/\b(boots?|booties|ankle boots?)\b/, ["boot"]],
  [/\b(loafers?|moccasins?)\b/, ["loafer"]],
];
const NEGATION = /\b(no|not|avoid|avoided|don't|do not|never|refrain|without|please avoid|prohibited|forbidden|banned)\b/;
const HARD_WORDS = /\b(must|required|mandatory|not permitted|not allowed|strictly|prohibited|forbidden|banned)\b/;

/**
 * Footwear styles named in one restriction, keeping polarity per clause: "Flats recommended, no stilettos"
 * prefers flats and avoids stilettos; "No flats" avoids flats. Returns null when no known style is named.
 */
export function parseFootwear(text: string): { prefer: FootwearStyle[]; avoid: FootwearStyle[] } | null {
  const prefer = new Set<FootwearStyle>();
  const avoid = new Set<FootwearStyle>();
  for (const clause of norm(text).split(/,|\.|\bbut\b|\bhowever\b|\binstead\b|\brather than\b/)) {
    let c = clause;
    const styles: FootwearStyle[] = [];
    for (const [re, s] of FOOTWEAR_WORDS) {
      if (re.test(c)) { styles.push(...s); c = c.replace(re, " "); } // consume so "heeled sandals" isn't also "sandals"
    }
    if (!styles.length) continue;
    for (const s of styles) (NEGATION.test(clause) ? avoid : prefer).add(s);
  }
  for (const s of avoid) prefer.delete(s); // a prohibition always wins over a preference for the same style
  return prefer.size || avoid.size ? { prefer: [...prefer], avoid: [...avoid] } : null;
}

/**
 * Deterministic structuring of a user's typed restrictions. Each line becomes a rule "Entered by you".
 * Only well-known patterns get structured colour/footwear fields; everything else stays as an `other` rule,
 * which is checked against the photo and then confirmed by the person rather than guessed.
 */
export function parseRestrictionText(text: string): Rule[] {
  const rules: Rule[] = [];
  for (const raw of text.split(/\n|;|•/).map((s) => s.trim()).filter(Boolean).slice(0, 10)) {
    const t = norm(raw);
    const colours = coloursIn(t);
    const negative = NEGATION.test(t);
    const foot = parseFootwear(t);
    if (foot) {
      // A prohibition you typed ("No boots") is a requirement; a stated preference ("Flats please") is advisory.
      const hard = HARD_WORDS.test(t) || (foot.avoid.length > 0 && foot.prefer.length === 0);
      rules.push({
        id: ruleId("u"), type: hard ? "footwear_requirement" : "footwear_preference", summary: raw.slice(0, 200),
        severity: hard ? "hard" : "advisory", source: "user", evidence_text: null, colours: [],
        footwear_avoid: foot.avoid, footwear_prefer: foot.prefer,
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
    // The quoted wording is the authority for footwear polarity; the model's lists are only a fallback.
    let type = r.type;
    let footwear_avoid = r.footwear_avoid;
    let footwear_prefer = r.footwear_prefer;
    if (type === "footwear_preference" || type === "footwear_requirement") {
      const parsed = parseFootwear(grounded ? r.evidence_text : r.summary);
      if (parsed) ({ avoid: footwear_avoid, prefer: footwear_prefer } = parsed);
      footwear_prefer = footwear_prefer.filter((s) => !footwear_avoid.includes(s));
      if (!footwear_avoid.length && !footwear_prefer.length) type = "other"; // unknown style: ask, don't pass it
    }
    if (grounded) {
      rules.push({
        id: ruleId("i"), type, summary: r.summary, severity: strong ? "hard" : "advisory", source: "invitation",
        evidence_text: r.evidence_text.trim(), colours, footwear_avoid, footwear_prefer,
      });
    } else {
      // Model claimed a rule we can't locate in the transcribed text: keep it only as a suggestion to confirm.
      rules.push({
        id: ruleId("s"), type, summary: r.summary, severity: "advisory", source: "suggested", evidence_text: null,
        colours, footwear_avoid, footwear_prefer,
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
