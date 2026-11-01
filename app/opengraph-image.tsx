import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { MARK_PATH } from "@/components/logo";

export const alt = "WearCheck — an outfit you own, an occasion to get right";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const font = (f: string) => readFile(path.join(process.cwd(), "node_modules", "@fontsource", f.startsWith("inter-tight") ? "inter-tight" : "inter", "files", f));
  const [bold, regular, photo] = await Promise.all([
    font("inter-tight-latin-700-normal.woff"),
    font("inter-latin-400-normal.woff"),
    readFile(path.join(process.cwd(), "public", "editorial", "hero-brick-wall.jpg")),
  ]);
  const src = `data:image/jpeg;base64,${photo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f3eee5", color: "#1a1917" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 700, padding: "64px 56px 56px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "Inter Tight", fontSize: 34, letterSpacing: -1 }}>
            <svg width="48" height="48" viewBox="0 0 32 32"><rect width="32" height="32" fill="#1a1917" /><path d={MARK_PATH} fill="none" stroke="#f3eee5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            WearCheck
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Inter Tight", fontSize: 64, lineHeight: 1, letterSpacing: -2.5 }}>An outfit you own.</div>
            <div style={{ fontFamily: "Inter Tight", fontSize: 64, lineHeight: 1, letterSpacing: -2.5, color: "#625c53", marginTop: 6 }}>An occasion to get right.</div>
            <div style={{ fontFamily: "Inter", fontSize: 26, lineHeight: 1.4, marginTop: 30, color: "#423e38", maxWidth: 560 }}>
              Check it against the invitation. Keep it, or preview one justified change.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", width: 500, height: 630, position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={500} height={630} alt="" style={{ objectFit: "cover", width: 500, height: 630 }} />
          <div style={{ position: "absolute", left: 16, bottom: 14, fontFamily: "Inter", fontSize: 15, color: "#1a1917", background: "rgba(243,238,229,0.85)", padding: "4px 8px" }}>
            Editorial photo · Brooke Cagle / Unsplash (CC0)
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Inter Tight", data: bold, weight: 700, style: "normal" }, { name: "Inter", data: regular, weight: 400, style: "normal" }] },
  );
}
