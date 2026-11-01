"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ClientApiError } from "@/lib/client";
import {
  COLOUR_FAMILIES, COLOUR_LABEL, FOOTWEAR_LABEL, FOOTWEAR_STYLES,
  type ColourFamily, type FootwearStyle, type Requirements, type Rule, type RuleType,
} from "@/lib/schemas";

const SOURCE_TEXT = { invitation: "From invitation", user: "Entered by you", suggested: "Suggested — confirm" } as const;

function SourceMark({ source }: { source: keyof typeof SOURCE_TEXT }) {
  return <span className={`chip ${source === "suggested" ? "border-dashed text-warn" : source === "invitation" ? "border-ink text-ink" : ""}`}>{SOURCE_TEXT[source]}</span>;
}

const GROUPS: { key: string; title: string; types: RuleType[] }[] = [
  { key: "colour", title: "Colour restrictions", types: ["colour_exclusion", "colour_request"] },
  { key: "footwear", title: "Footwear", types: ["footwear_preference", "footwear_requirement"] },
  { key: "other", title: "Other notes", types: ["garment_exclusion", "garment_requirement", "coverage", "other"] },
];

const NEW_RULE: Record<string, Rule> = {
  colour: { id: "", type: "colour_exclusion", summary: "", severity: "hard", source: "user", evidence_text: null, colours: [], footwear_avoid: [], footwear_prefer: [] },
  footwear: { id: "", type: "footwear_preference", summary: "", severity: "advisory", source: "user", evidence_text: null, colours: [], footwear_avoid: [], footwear_prefer: [] },
  other: { id: "", type: "other", summary: "", severity: "advisory", source: "user", evidence_text: null, colours: [], footwear_avoid: [], footwear_prefer: [] },
};

const rid = () => `u${Math.random().toString(36).slice(2, 9)}`;

function Multi<T extends string>({ label, all, value, labels, onChange }: { label: string; all: readonly T[]; value: T[]; labels: Record<T, string>; onChange: (v: T[]) => void }) {
  return (
    <fieldset className="mt-3">
      <legend className="text-[0.9rem] font-semibold text-ink-2">{label}</legend>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {all.map((c) => {
          const on = value.includes(c);
          return (
            <button key={c} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== c) : [...value, c])}
              className={`min-h-10 border px-3 text-[0.9rem] transition-colors ${on ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-2"}`}>
              {labels[c]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function RuleCard({ rule, onChange, onRemove, invitationUrl }: { rule: Rule; onChange: (r: Rule) => void; onRemove: () => void; invitationUrl: string | null }) {
  const [editing, setEditing] = useState(rule.summary === "");
  const [showSource, setShowSource] = useState(false);
  const isColour = rule.type === "colour_exclusion" || rule.type === "colour_request";
  const isFoot = rule.type === "footwear_preference" || rule.type === "footwear_requirement";
  // Editing an invitation rule's wording turns it into the user's own version (we never claim the invitation said it).
  const edit = (patch: Partial<Rule>) => {
    const changesMeaning = "summary" in patch || "colours" in patch || "footwear_avoid" in patch || "footwear_prefer" in patch || "severity" in patch;
    onChange({ ...rule, ...patch, ...(changesMeaning && rule.source === "invitation" ? { source: "user", evidence_text: null } : {}), ...(changesMeaning && rule.source === "suggested" ? { source: "user", severity: patch.severity ?? "advisory" } : {}) });
  };
  return (
    <li className="bg-raised p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <SourceMark source={rule.source} />
        <span className="text-[0.875rem] text-muted">{rule.severity === "hard" ? "Rule" : "Recommendation"}</span>
      </div>
      {editing ? (
        <div className="mt-3">
          <label className="block text-sm">
            <span className="sr-only">Requirement text</span>
            <input className="field" value={rule.summary} maxLength={200} onChange={(e) => edit({ summary: e.target.value })} placeholder="Describe the requirement" autoFocus />
          </label>
          {isColour ? (
            <>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[0.95rem]">
                <label className="flex items-center gap-2"><input type="radio" checked={rule.type === "colour_exclusion"} onChange={() => edit({ type: "colour_exclusion", severity: "hard" })} /> Colours to avoid</label>
                <label className="flex items-center gap-2"><input type="radio" checked={rule.type === "colour_request"} onChange={() => edit({ type: "colour_request", severity: "advisory" })} /> Colours requested</label>
              </div>
              <Multi label="Colours" all={COLOUR_FAMILIES.filter((c) => c !== "other" && c !== "multicolour") as ColourFamily[]} value={rule.colours} labels={COLOUR_LABEL} onChange={(v) => edit({ colours: v })} />
            </>
          ) : null}
          {isFoot ? (
            <>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[0.95rem]">
                <label className="flex items-center gap-2"><input type="radio" checked={rule.type === "footwear_preference"} onChange={() => edit({ type: "footwear_preference", severity: "advisory" })} /> Recommended</label>
                <label className="flex items-center gap-2"><input type="radio" checked={rule.type === "footwear_requirement"} onChange={() => edit({ type: "footwear_requirement", severity: "hard" })} /> Required</label>
              </div>
              <Multi label="Suitable styles" all={FOOTWEAR_STYLES.filter((s) => s !== "other") as FootwearStyle[]} value={rule.footwear_prefer} labels={FOOTWEAR_LABEL} onChange={(v) => edit({ footwear_prefer: v })} />
              <Multi label="Styles to avoid" all={FOOTWEAR_STYLES.filter((s) => s !== "other") as FootwearStyle[]} value={rule.footwear_avoid} labels={FOOTWEAR_LABEL} onChange={(v) => edit({ footwear_avoid: v })} />
            </>
          ) : null}
          {!isColour && !isFoot ? (
            <label className="mt-3 flex items-center gap-2 text-[0.95rem]"><input type="checkbox" checked={rule.severity === "hard"} onChange={(e) => edit({ severity: e.target.checked ? "hard" : "advisory" })} /> This is a firm rule, not a suggestion</label>
          ) : null}
          <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={() => setEditing(false)} disabled={!rule.summary.trim()}>Done</button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-[1.05rem] font-semibold">{rule.summary}</p>
          {isColour && rule.colours.length ? <p className="mt-1 text-sm text-ink-2">{rule.type === "colour_exclusion" ? "Avoid" : "Requested"}: {rule.colours.map((c) => COLOUR_LABEL[c]).join(", ")}</p> : null}
          {isFoot && (rule.footwear_prefer.length || rule.footwear_avoid.length) ? (
            <p className="mt-1 text-sm text-ink-2">
              {rule.footwear_prefer.length ? `Suitable: ${rule.footwear_prefer.map((s) => FOOTWEAR_LABEL[s]).join(", ")}. ` : ""}
              {rule.footwear_avoid.length ? `Avoid: ${rule.footwear_avoid.map((s) => FOOTWEAR_LABEL[s]).join(", ")}.` : ""}
            </p>
          ) : isFoot ? <p className="mt-1 text-sm text-ink-2">No specific style chosen — we&rsquo;ll ask you about this one instead of guessing.</p> : null}
          {rule.source === "invitation" && rule.evidence_text ? (
            <div className="mt-2">
              <button type="button" className="min-h-10 text-[0.95rem] underline underline-offset-4" aria-expanded={showSource} onClick={() => setShowSource((s) => !s)}>{showSource ? "Hide source" : "Show source text"}</button>
              {showSource ? (
                <blockquote className="mt-2 border-l-2 border-ink pl-3 text-sm italic text-ink-2">
                  “{rule.evidence_text}”
                  {invitationUrl ? <a href={invitationUrl} target="_blank" rel="noopener" className="mt-1 block not-italic underline">Open the invitation image</a> : null}
                </blockquote>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex gap-4">
            <button type="button" className="btn btn-quiet text-[0.95rem]" onClick={() => setEditing(true)}>Edit</button>
            <button type="button" className="btn btn-quiet text-[0.95rem]" onClick={onRemove}>Remove</button>
          </div>
        </>
      )}
    </li>
  );
}

export function RequirementsEditor({ checkId, initial, revision, confirmed, invitationUrl, isDemo }: {
  checkId: string; initial: Requirements; revision: number; confirmed: boolean; invitationUrl: string | null; isDemo: boolean;
}) {
  const router = useRouter();
  const [r, setR] = useState<Requirements>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editDress, setEditDress] = useState(false);

  const setRule = (id: string, next: Rule) => setR((x) => ({ ...x, rules: x.rules.map((y) => (y.id === id ? next : y)) }));
  const removeRule = (id: string) => setR((x) => ({ ...x, rules: x.rules.filter((y) => y.id !== id) }));
  const addRule = (g: string) => setR((x) => ({ ...x, no_restrictions_stated: false, rules: [...x.rules, { ...NEW_RULE[g], id: rid() }] }));

  const ready = Boolean(r.event_type || r.dress_code || r.event_name || r.no_restrictions_stated);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const clean = { ...r, rules: r.rules.filter((x) => x.summary.trim()) };
      const res = await api<{ nextPath: string }>(`/api/checks/${checkId}/requirements`, { method: "PUT", body: JSON.stringify({ revision, requirements: clean }) });
      router.push(res.nextPath);
      router.refresh();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.body.message : "Couldn't save. Please try again.");
      setBusy(false);
    }
  }

  const venueSource = r.venue.source;
  return (
    <div className="max-w-[48rem]">
      <p className="eyebrow plain">{confirmed ? `Step 1 · Confirmed · revision ${revision}` : "Step 1 · Confirm the requirements"}</p>
      <h1 className="t-2 mt-3">Here&rsquo;s what we understood</h1>
      <p className="lede mt-4">You&rsquo;re the authority on this event. Edit, remove or add anything before we look at your outfit.</p>
      {isDemo ? <p className="mt-4 border-l-2 border-accent pl-3 text-sm text-ink-2">These requirements were <strong>entered for this example</strong>. They didn&rsquo;t come from a real invitation.</p> : null}
      {confirmed ? <p className="mt-4 text-sm text-muted">Changing these creates a new revision. Earlier assessments will be marked out of date; your photo is kept.</p> : null}

      {r.uncertainties.length ? (
        <div className="mt-6 border-l-2 border-warn bg-raised p-4">
          <p className="font-semibold">Please double-check</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">{r.uncertainties.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </div>
      ) : null}

      {/* Event */}
      <section className="mt-10 border-t border-ink pt-6" aria-labelledby="h-event">
        <h2 id="h-event" className="font-display text-xl font-semibold tracking-[-0.02em]">Event</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-2"><span className="label">Name</span>
            <input className="field" value={r.event_name ?? ""} maxLength={120} onChange={(e) => setR({ ...r, event_name: e.target.value || null })} placeholder="e.g. Sam & Alex's wedding" />
          </label>
          <label className="block"><span className="label">Occasion</span>
            <select className="field" value={r.event_type ?? ""} onChange={(e) => setR({ ...r, event_type: (e.target.value || null) as Requirements["event_type"] })}>
              <option value="">Not specified</option><option value="wedding">Wedding</option><option value="work">Work</option><option value="celebration">Celebration</option><option value="religious">Religious event</option><option value="other">Other</option>
            </select>
          </label>
          <label className="block"><span className="label">Date</span>
            <input type="date" className="field" value={r.event_date ?? ""} onChange={(e) => setR({ ...r, event_date: e.target.value || null })} />
          </label>
        </div>
      </section>

      {/* Dress code */}
      <section className="mt-10 border-t border-ink pt-6" aria-labelledby="h-dress">
        <h2 id="h-dress" className="font-display text-xl font-semibold tracking-[-0.02em]">Dress code</h2>
        {r.dress_code && !editDress ? (
          <div className="mt-4 bg-raised p-4 sm:p-5">
            <SourceMark source={r.dress_code.source} />
            <p className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em]">{r.dress_code.value}</p>
            {r.dress_code.ambiguous ? <p className="mt-1 text-sm text-warn">This wording is open to interpretation — we won&rsquo;t turn it into hard rules.</p> : null}
            {r.dress_code.source === "invitation" && r.dress_code.evidence_text ? <p className="mt-1 text-sm italic text-ink-2">“{r.dress_code.evidence_text}”</p> : null}
            <div className="mt-3 flex gap-4">
              <button type="button" className="btn btn-quiet text-[0.95rem]" onClick={() => setEditDress(true)}>Edit</button>
              <button type="button" className="btn btn-quiet text-[0.95rem]" onClick={() => setR({ ...r, dress_code: null })}>Remove</button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            {!r.dress_code ? <p className="text-sm text-muted">We couldn&rsquo;t find a clear dress code.</p> : null}
            <label className="mt-2 block"><span className="sr-only">Dress code</span>
              <input className="field" placeholder="Add one if you know it (optional)" value={r.dress_code?.value ?? ""} maxLength={120}
                onChange={(e) => setR({ ...r, dress_code: e.target.value ? { value: e.target.value, source: "user", evidence_text: null, ambiguous: /impress|festive|chic|elevated|dressy/i.test(e.target.value) } : null })} />
            </label>
            {editDress ? <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => setEditDress(false)}>Done</button> : null}
          </div>
        )}
      </section>

      {/* Venue */}
      <section className="mt-10 border-t border-ink pt-6" aria-labelledby="h-venue">
        <h2 id="h-venue" className="font-display text-xl font-semibold tracking-[-0.02em]">Venue &amp; conditions</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SourceMark source={venueSource} />
          {r.venue.evidence_text ? <span className="text-sm italic text-ink-2">“{r.venue.evidence_text}”</span> : null}
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Setting</span>
            <select className="field" value={r.venue.setting} onChange={(e) => setR({ ...r, venue: { ...r.venue, setting: e.target.value as Requirements["venue"]["setting"], source: "user", evidence_text: null } })}>
              <option value="unknown">Not sure</option><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option><option value="mixed">Indoor and outdoor</option>
            </select>
          </label>
          <label className="block"><span className="label">Ground</span>
            <select className="field" value={r.venue.surface} onChange={(e) => setR({ ...r, venue: { ...r.venue, surface: e.target.value as Requirements["venue"]["surface"], source: "user", evidence_text: null } })}>
              <option value="unknown">Not sure</option><option value="grass">Grass / lawn</option><option value="sand">Sand / beach</option><option value="gravel">Gravel</option><option value="cobblestone">Cobblestones</option><option value="hard_floor">Hard floor</option>
            </select>
          </label>
        </div>
      </section>

      {GROUPS.map((g) => {
        const rules = r.rules.filter((x) => g.types.includes(x.type));
        return (
          <section key={g.key} className="mt-10 border-t border-ink pt-6" aria-labelledby={`h-${g.key}`}>
            <h2 id={`h-${g.key}`} className="font-display text-xl font-semibold tracking-[-0.02em]">{g.title}</h2>
            {rules.length ? (
              <ul className="mt-3 grid gap-3">{rules.map((x) => <RuleCard key={x.id} rule={x} onChange={(n) => setRule(x.id, n)} onRemove={() => removeRule(x.id)} invitationUrl={invitationUrl} />)}</ul>
            ) : <p className="mt-2 text-sm text-muted">None.</p>}
            <button type="button" className="btn btn-quiet mt-3 text-[0.95rem]" onClick={() => addRule(g.key)}>+ Add {g.key === "colour" ? "a colour rule" : g.key === "footwear" ? "a footwear note" : "a note"}</button>
          </section>
        );
      })}

      <label className="mt-8 flex items-start gap-3 border-t border-line pt-5">
        <input type="checkbox" className="mt-1 size-5 accent-[var(--ink)]" checked={r.no_restrictions_stated} disabled={r.rules.length > 0}
          onChange={(e) => setR({ ...r, no_restrictions_stated: e.target.checked })} />
        <span><span className="font-medium">No restrictions stated</span><span className="block text-sm text-muted">The event gave no specific clothing rules.</span></span>
      </label>

      {error ? <p role="alert" className="mt-6 border-l-2 border-bad pl-3 font-medium">{error}</p> : null}
      <div className="sticky bottom-0 -mx-[clamp(1rem,4vw,3.5rem)] mt-10 border-t border-line bg-bg/95 px-[clamp(1rem,4vw,3.5rem)] pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={!ready || busy} onClick={confirm}>{busy ? "Saving…" : "These details are correct"}</button>
        {!ready ? <p className="mt-2 text-sm text-muted">Add an occasion or dress code, or tick “No restrictions stated”.</p> : null}
      </div>
    </div>
  );
}
