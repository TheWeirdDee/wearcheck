import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "WearCheck — check the outfit you already own against the invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const font = (f: string) => readFile(path.join(process.cwd(), "node_modules", "@fontsource", f.startsWith("inter-tight") ? "inter-tight" : "inter", "files", f));
  const [bold, regular] = await Promise.all([font("inter-tight-latin-700-normal.woff"), font("inter-latin-400-normal.woff")]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f6f2ea", color: "#1e1d1b", padding: 72 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontFamily: "Inter Tight" }}>
          <span>WearCheck</span>
          <span style={{ fontFamily: "Inter", fontSize: 22, letterSpacing: 3, color: "#6b665e" }}>OUTFIT CHECK FOR REAL OCCASIONS</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Inter Tight", fontSize: 84, lineHeight: 1.02, letterSpacing: -2, maxWidth: 980 }}>Not sure if your outfit fits the dress code?</div>
          <div style={{ fontFamily: "Inter", fontSize: 32, marginTop: 28, color: "#4a4640", maxWidth: 900 }}>Keep what works. Preview one change only when it&apos;s needed.</div>
        </div>
        <div style={{ display: "flex", height: 6, width: 160, background: "#7a5c3e" }} />
      </div>
    ),
    { ...size, fonts: [{ name: "Inter Tight", data: bold, weight: 700, style: "normal" }, { name: "Inter", data: regular, weight: 400, style: "normal" }] },
  );
}
