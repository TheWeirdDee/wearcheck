import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { handler } from "@/lib/api";
import { requireOwnedCheck, trackEvent } from "@/lib/checks";
import { db } from "@/lib/db";
import { CARD_DISCLAIMER, dressCodeSource, loadDecision, SOURCE_LABEL } from "@/lib/decision";
import { AppError } from "@/lib/errors";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 30;

const font = (pkg: string, file: string) => readFile(path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file));

async function dataUri(bytes: Buffer, w: number, h: number) {
  const out = await sharp(bytes).resize({ width: w, height: h, fit: "cover", position: "attention" }).jpeg({ quality: 84 }).toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

const C = { ivory: "#F6F2EA", ink: "#1E1D1B", muted: "#6B665E", line: "#D9D2C5", accent: "#7A5C3E", ok: "#3F5D45" };

/**
 * Outfit Decision Card as a PNG (1080×1350). Images are embedded inline, so the file contains
 * no private URLs. Works for the no-change outcome without any render.
 */
export const GET = handler("decision_card", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const check = await requireOwnedCheck((await ctx.params).id);
  const d = await loadDecision(check);
  if (!d) throw new AppError("NO_DECISION", "Choose to keep your outfit or use a preview first.", 409, true, "NONE");

  const [photoRow] = await db()`select storage_key from wearcheck.media_assets where id = ${d.photoAssetId} and check_id = ${check.id}`;
  const original = await getObject(photoRow.storage_key as string);
  let preview: Buffer | null = null;
  if (d.job?.result_asset_id) {
    const [r] = await db()`select storage_key from wearcheck.media_assets where id = ${d.job.result_asset_id} and check_id = ${check.id}`;
    preview = await getObject(r.storage_key as string);
  }
  const twoUp = Boolean(preview);
  const imgW = twoUp ? 470 : 640;
  const imgH = twoUp ? 620 : 700;
  const [origUri, prevUri] = await Promise.all([dataUri(original, imgW, imgH), preview ? dataUri(preview, imgW, imgH) : Promise.resolve(null)]);
  const [t600, t700, i400, i500, i600] = await Promise.all([
    font("inter-tight", "inter-tight-latin-600-normal.woff"), font("inter-tight", "inter-tight-latin-700-normal.woff"),
    font("inter", "inter-latin-400-normal.woff"), font("inter", "inter-latin-500-normal.woff"), font("inter", "inter-latin-600-normal.woff"),
  ]);

  const r = d.requirements;
  const kf = d.keyFinding;
  const keep = d.decision === "keep";
  const title = keep ? "Keep what you have" : "Consider this one change";
  const recommendation = keep
    ? d.result.status === "compatible" ? "No change needed. Nothing in your confirmed requirements conflicts with this outfit." : `You chose to keep this outfit.${kf ? ` Noted: ${kf.observation}` : ""}`
    : kf ? `${kf.observation} ${kf.reason}` : "Preview the suggested change.";
  const evidence = kf?.evidence_text ? `“${kf.evidence_text}” · ${SOURCE_LABEL[kf.evidence_source] ?? ""}` : kf ? SOURCE_LABEL[kf.evidence_source] ?? "" : "";
  const occasion = r.event_name ?? (r.event_type ? r.event_type[0].toUpperCase() + r.event_type.slice(1) : "Your occasion");
  const date = r.event_date ? new Date(`${r.event_date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null;
  const itemLine = d.item ? `${d.item.title} — ${d.item.creator}, ${d.item.licence}. Visual reference, not a shopping listing.` : d.userRefAssetId ? "Reference item provided by you." : null;
  const stamp = new Date(d.generatedAt).toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const label = (text: string, dark = false) => (
    <div style={{ position: "absolute", left: 14, top: 14, display: "flex", padding: "6px 12px", fontSize: 20, fontFamily: "Inter", fontWeight: 600, letterSpacing: 1, background: dark ? C.ink : C.ivory, color: dark ? C.ivory : C.ink }}>{text}</div>
  );

  await trackEvent(check.id, "card_downloaded", { keep });
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.ivory, color: C.ink, padding: "56px 60px", fontFamily: "Inter" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${C.ink}`, paddingBottom: 18 }}>
          <div style={{ fontFamily: "Inter Tight", fontWeight: 700, fontSize: 34, letterSpacing: -0.5 }}>WearCheck</div>
          <div style={{ fontSize: 20, color: C.muted, letterSpacing: 2 }}>OUTFIT DECISION CARD</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
          <div style={{ fontSize: 24, color: C.muted }}>{[occasion, date].filter(Boolean).join(" · ")}</div>
          <div style={{ fontFamily: "Inter Tight", fontWeight: 700, fontSize: 64, letterSpacing: -1.5, lineHeight: 1.05, marginTop: 8 }}>{title}</div>
          <div style={{ fontSize: 24, marginTop: 10, color: keep && d.result.status === "compatible" ? C.ok : C.accent, fontWeight: 600 }}>{d.result.headline}</div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 28, justifyContent: twoUp ? "space-between" : "center" }}>
          <div style={{ display: "flex", position: "relative", width: imgW, height: imgH }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={origUri} width={imgW} height={imgH} alt="" style={{ objectFit: "cover" }} />
            {label("ORIGINAL PHOTO")}
          </div>
          {prevUri ? (
            <div style={{ display: "flex", position: "relative", width: imgW, height: imgH }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={prevUri} width={imgW} height={imgH} alt="" style={{ objectFit: "cover" }} />
              {label("AI-GENERATED PREVIEW", true)}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 26, gap: 10, flexGrow: 1 }}>
          <div style={{ fontSize: 27, lineHeight: 1.35, fontWeight: 500 }}>{recommendation.slice(0, 260)}</div>
          {evidence ? <div style={{ fontSize: 21, color: C.muted, lineHeight: 1.35 }}>Evidence: {evidence.slice(0, 200)}</div> : null}
          <div style={{ fontSize: 21, color: C.muted }}>Dress code source: {dressCodeSource(r).slice(0, 120)}</div>
          {itemLine ? <div style={{ fontSize: 19, color: C.muted, lineHeight: 1.35 }}>{itemLine.slice(0, 220)}</div> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.line}`, paddingTop: 16, fontSize: 18, color: C.muted }}>
          <div style={{ display: "flex" }}>{CARD_DISCLAIMER}{twoUp ? " AI previews aren't proof of fit." : ""}</div>
          <div style={{ display: "flex" }}>{stamp}</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Inter Tight", data: t600, weight: 600, style: "normal" },
        { name: "Inter Tight", data: t700, weight: 700, style: "normal" },
        { name: "Inter", data: i400, weight: 400, style: "normal" },
        { name: "Inter", data: i500, weight: 500, style: "normal" },
        { name: "Inter", data: i600, weight: 600, style: "normal" },
      ],
      headers: {
        "Cache-Control": "private, no-store",
        ...(download ? { "Content-Disposition": `attachment; filename="wearcheck-decision-card.png"` } : {}),
      },
    },
  );
});
