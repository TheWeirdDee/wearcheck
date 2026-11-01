// Verifies which image-capable Gemini models this API key can call, then makes one tiny
// image request with the configured GEMINI_MODEL. Prints model names and status only — never the key.
//   node scripts/gemini-verify.mjs
import sharp from "sharp";
import { loadEnv } from "./env.mjs";

loadEnv();
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY is empty in .env.local");
  process.exit(2);
}
const H = { "x-goog-api-key": key };
const list = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: H });
const lj = await list.json();
if (!list.ok) {
  console.error("list models failed", list.status, lj.error?.status, lj.error?.message?.slice(0, 160));
  process.exit(1);
}
const usable = (lj.models ?? []).filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /gemini/.test(m.name) && !/embedding|tts|image-generation|live|native-audio/.test(m.name));
console.log("generateContent-capable Gemini models visible to this key:");
for (const m of usable) console.log(" ", m.name.replace("models/", ""), "|", m.inputTokenLimit, "in");

const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#1e3a8a" } }).png().toBuffer();
const t0 = Date.now();
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: "POST",
  headers: { ...H, "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/png", data: png.toString("base64") } }, { text: "What is the dominant colour family of this image? Answer as JSON." }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { colour: { type: "STRING" } }, required: ["colour"] }, temperature: 0 },
  }),
});
const j = await r.json();
console.log(`\nimage call with ${model}: HTTP ${r.status} in ${Date.now() - t0}ms`);
if (r.ok) {
  console.log("response:", j.candidates?.[0]?.content?.parts?.[0]?.text, "| modelVersion:", j.modelVersion);
} else {
  console.log("error:", j.error?.status, j.error?.message?.slice(0, 200));
  if (r.status === 429) console.log("→ Free-tier quota or rate limit reached for this model. Try another model from the list above via GEMINI_MODEL.");
}
