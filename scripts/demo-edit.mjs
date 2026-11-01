// Cuts the raw footage from scripts/demo-record.mjs into ONE exactly 180-second MP4 (1920×1080) with a
// synthesised voiceover (Windows SAPI) and burned-in captions. Layout keeps overlays off the app:
// the app footage fills a 1536×864 area; captions live in the band below it and disclosures/badges in the
// panel to its right. Only provider waits are sped up, each with its real duration on screen; other edits
// are cuts between real moments, flagged in the panel. Scene text and cut points come from a scenes file.
//   node scripts/demo-edit.mjs <raw.json> <ffmpeg.exe> <scenes.json>
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const [rawJson, ffmpeg, scenesFile] = process.argv.slice(2);
const rec = JSON.parse(readFileSync(rawJson, "utf8"));
const { total: TOTAL, scenes } = JSON.parse(readFileSync(scenesFile, "utf8"));
// Sources: the main desktop take, its mobile take, and optionally segments from another take ("extra").
const srcs = { desktop: { file: rec.desktop, marks: rec.marks, offset: rec.offset }, mobile: { file: rec.mobile, marks: rec.mobileMarks, offset: rec.mobileOffset }, ...(rec.extra ?? {}) };
const work = resolve(dirname(rawJson), "edit");
mkdirSync(work, { recursive: true });

const at = (src, ref) => {
  const [name, off] = String(ref).split(/(?=[+-]\d)/);
  const m = srcs[src].marks.find((x) => x.name === name);
  if (!m) throw new Error(`unknown mark ${src}:${name}`);
  // offset: video time minus script time for this source, measured from scene changes (recording can start early).
  return m.t + (srcs[src].offset ?? 0) + (off ? Number(off) : 0);
};

if (scenes.reduce((s, x) => s + x.target, 0) !== TOTAL) throw new Error(`scene targets don't sum to ${TOTAL}`);

// ---------- cut list ----------
const pieces = []; // { src, a, b, speed, pad }
const timeline = [];
const panel = []; // [start, end, slot, text]
let t = 0;
for (const sc of scenes) {
  const ps = sc.pieces.map((p) => {
    const a = at(p.src ?? "desktop", p.from);
    let b = at(p.src ?? "desktop", p.to);
    if (p.max && b - a > p.max) b = a + p.max;
    if (b <= a) throw new Error(`${sc.id}: empty piece ${p.from}→${p.to}`);
    return { ...p, src: p.src ?? "desktop", a, b, raw: b - a };
  });
  const real = ps.filter((p) => !p.wait).reduce((s, p) => s + p.raw, 0);
  const waits = ps.filter((p) => p.wait);
  const waitRaw = waits.reduce((s, p) => s + p.raw, 0);
  let budget = sc.target - real;
  if (budget < 2.5 * waits.length - 1e-6) throw new Error(`${sc.id}: real footage ${real.toFixed(1)}s leaves ${budget.toFixed(1)}s for ${waits.length} wait(s); target ${sc.target}`);
  let used = 0;
  let cursor = t;
  for (const p of ps) {
    let speed = 1;
    if (p.wait) {
      const alloc = Math.max(2.5, (budget * p.raw) / waitRaw);
      speed = Math.max(1, p.raw / alloc);
      panel.push([cursor, cursor + p.raw / speed, "wait", speed > 1.01 ? `${p.wait}\nshown ×${speed.toFixed(1)} faster — actual wait ${p.raw.toFixed(1)} s` : `${p.wait}\nreal time — ${p.raw.toFixed(1)} s`]);
    }
    const len = p.raw / speed;
    pieces.push({ src: p.src, a: p.a, b: p.b, speed, pad: 0 });
    used += len;
    cursor += len;
  }
  const pad = sc.target - used;
  if (pad < -0.05) throw new Error(`${sc.id}: footage ${used.toFixed(1)}s exceeds target ${sc.target}s`);
  pieces.at(-1).pad += Math.max(0, pad); // hold the last real frame
  const cut = ps.length > 1 && ps.some((p, i) => i > 0 && Math.abs(p.a - ps[i - 1].b) > 0.3);
  timeline.push({ id: sc.id, start: t, end: t + sc.target });
  panel.push([t, t + sc.target, "title", sc.title]);
  if (sc.badge) panel.push([t, t + sc.target, "badge", sc.badge]);
  if (sc.note) panel.push([t, t + sc.target, "note", sc.note]);
  if (cut || sc.cutNote) panel.push([t, t + sc.target, "cut", sc.cutNote ?? "Edited for time: jump cuts between real steps"]);
  t += sc.target;
}

// ---------- voiceover ----------
const durOf = (file) => {
  try { execFileSync(ffmpeg, ["-hide_banner", "-i", file], { stdio: "pipe" }); } catch (e) {
    const m = String(e.stderr).match(/Duration: (\d+):(\d+):([\d.]+)/);
    return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
  }
  return 0;
};
const voice = scenes.map((sc, i) => {
  const wav = resolve(work, `vo-${sc.id}.wav`);
  const text = sc.vo.replace(/'/g, "''");
  execFileSync("powershell.exe", ["-NoProfile", "-Command", `Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('Microsoft Zira Desktop'); $s.Rate=${sc.rate ?? 1}; $s.SetOutputToWaveFile('${wav}'); $s.Speak('${text}'); $s.Dispose()`]);
  const duration = durOf(wav);
  const start = timeline[i].start + (sc.voAt ?? 0.4);
  if (start + duration > timeline[i].end - 0.2) throw new Error(`voiceover ${sc.id} is ${duration.toFixed(1)}s; scene has ${(timeline[i].end - start - 0.2).toFixed(1)}s`);
  return { wav, at: start, duration, text: sc.vo, captions: sc.captions };
});

// ---------- captions + panel (ASS, 1920×1080) ----------
const ts = (x) => { const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = (x % 60).toFixed(2).padStart(5, "0"); return `${h}:${String(m).padStart(2, "0")}:${s}`; };
const esc = (s) => s.replace(/\n/g, "\\N");
let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Segoe UI,40,&H00E5EEF3,&H00E5EEF3,&H00171819,&H00171819,0,0,0,0,100,100,0,0,1,0,0,8,70,70,892,1
Style: title,Segoe UI Semibold,30,&H00E5EEF3,&H00E5EEF3,&H00171819,&H00171819,1,0,0,0,100,100,0,0,1,0,0,7,1566,30,40,1
Style: badge,Segoe UI Semibold,26,&H00171819,&H00171819,&H0067B3D9,&H0067B3D9,1,0,0,0,100,100,0,0,3,10,0,7,1566,40,150,1
Style: wait,Segoe UI,24,&H00171819,&H00171819,&H00E5EEF3,&H00E5EEF3,0,0,0,0,100,100,0,0,3,10,0,7,1566,40,330,1
Style: note,Segoe UI,23,&H00C8D3D8,&H00C8D3D8,&H00171819,&H00171819,0,0,0,0,100,100,0,0,1,0,0,7,1566,36,520,1
Style: cut,Segoe UI,21,&H00A9B4B9,&H00A9B4B9,&H00171819,&H00171819,0,1,0,0,100,100,0,0,1,0,0,7,1566,36,650,1
Style: stamp,Segoe UI,21,&H00A9B4B9,&H00A9B4B9,&H00171819,&H00171819,0,0,0,0,100,100,0,0,1,0,0,1,1566,36,236,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
// Captions follow the voiceover sentence by sentence, timed by word count.
for (const v of voice) {
  const parts = v.captions ?? v.text.match(/[^.!?]+[.!?]+(\s|$)/g).map((s) => s.trim());
  const words = parts.map((p) => p.split(/\s+/).length);
  const sum = words.reduce((a, b) => a + b, 0);
  let c = v.at;
  parts.forEach((p, i) => {
    const d = (v.duration * words[i]) / sum;
    ass += `Dialogue: 0,${ts(c)},${ts(c + d + (i === parts.length - 1 ? 0.5 : 0.05))},Caption,,0,0,0,,${esc(p)}\n`;
    c += d;
  });
}
for (const [a, b, slot, text] of panel) ass += `Dialogue: 1,${ts(a)},${ts(b)},${slot},,0,0,0,,${esc(text)}\n`;
ass += `Dialogue: 2,${ts(0)},${ts(TOTAL)},stamp,,0,0,0,,Real footage of the deployed app\\Nwearcheck.vercel.app · recorded 1 Nov 2026\\NVoice: synthesised (Windows SAPI)\n`;
const assPath = join(work, "captions-180.ass");
writeFileSync(assPath, ass);

// ---------- render ----------
// Each piece is rendered to its own clip first (seeking per piece keeps memory flat), then concatenated.
const fitFor = (src) => (srcs[src].mobile || src === "mobile" ? "scale=-2:864:flags=lanczos,pad=1536:864:(ow-iw)/2:0:color=0x2A2825" : "scale=1536:864:flags=lanczos");
// Playwright's WebM is variable-frame-rate without seek cues, so seeking in it is inaccurate. Convert each
// source once to constant 30 fps with a keyframe every second; cut points then land on the marked moments.
for (const [name, s] of Object.entries(srcs)) {
  if (!s?.file) continue;
  const cfr = join(work, `src-${name}.mp4`);
  execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", s.file, "-vf", "fps=30", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", "-g", "30", "-pix_fmt", "yuv420p", cfr]);
  s.file = cfr;
}
const list = [];
pieces.forEach((p, i) => {
  const clip = join(work, `piece-${String(i).padStart(2, "0")}.mp4`);
  const vf = `setpts=(PTS-STARTPTS)/${p.speed.toFixed(4)},fps=30,${fitFor(p.src)},setsar=1${p.pad > 0.01 ? `,tpad=stop_mode=clone:stop_duration=${p.pad.toFixed(3)}` : ""}`;
  execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-ss", p.a.toFixed(3), "-t", (p.b - p.a).toFixed(3), "-i", srcs[p.src].file, "-vf", vf, "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-pix_fmt", "yuv420p", clip]);
  list.push(`file '${clip.replace(/\\/g, "/")}'`);
});
const listFile = join(work, "pieces.txt");
writeFileSync(listFile, list.join("\n"));
const joined = join(work, "joined.mp4");
execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", joined]);

const comp = `[0:v]pad=1920:1080:0:0:color=0x171819,subtitles='${assPath.replace(/\\/g, "/").replace(/:/g, "\\:")}',trim=duration=${TOTAL},setpts=PTS-STARTPTS[vout]`;
const af = voice.map((v, i) => `[${i + 1}:a]adelay=${Math.round(v.at * 1000)}|${Math.round(v.at * 1000)},aformat=sample_rates=48000:channel_layouts=stereo[a${i}]`);
const mix = `${voice.map((_, i) => `[a${i}]`).join("")}amix=inputs=${voice.length}:normalize=0,apad,atrim=duration=${TOTAL}[aout]`;
const outFile = join(dirname(rawJson), `wearcheck-demo-${TOTAL}s.mp4`);
const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", joined, ...voice.flatMap((v) => ["-i", v.wav]), "-filter_complex", [comp, ...af, mix].join(";"), "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-t", String(TOTAL), "-movflags", "+faststart", outFile];
execFileSync(ffmpeg, args, { stdio: "inherit" });
writeFileSync(join(dirname(rawJson), `wearcheck-demo-${TOTAL}s.json`), JSON.stringify({ rawJson, pieces, timeline, panel, voice: voice.map((v) => ({ at: v.at, duration: v.duration, text: v.text })) }, null, 2));
console.log("wrote", outFile);
