// Cuts the raw recording from scripts/demo-record.mjs into an exactly 120-second demo with
// burned-in captions, on-screen disclosures and a synthesised voiceover (Windows SAPI voice).
// Only the three provider waits (Gemini ×2, YouCam ×1) are sped up, and each speed-up is shown on screen
// with the real duration. Everything else plays in real time (with cuts between scenes).
//   node scripts/demo-edit.mjs <raw.webm> <ffmpeg.exe>
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const [raw, ffmpeg] = process.argv.slice(2);
const { marks } = JSON.parse(readFileSync(raw.replace(/\.webm$/, ".json"), "utf8"));
const M = Object.fromEntries(marks.map((m) => [m.name, m.t]));
const work = join(dirname(raw), "edit");
mkdirSync(work, { recursive: true });

// [scene, raw start, raw end, target seconds, wait interval | null, voiceover, extra on-screen note]
const scenes = [
  ["s1", M.s1_landing, M.s2_story, 9, null, "You have the invitation. The outfit is already in your wardrobe. Does it work for this event?", null],
  ["s2", M.s2_story, M.s3_invitation, 11, null, "WearCheck starts with what the invitation says, then looks at the outfit you already own.", null],
  ["s3", M.s3_invitation, M.s4_outfit, 21, [M.w_gemini_invitation_start, M.w_gemini_invitation_end, "Gemini reading"], "Upload the invitation. Gemini reads it, and each requirement is quoted word for word, for you to confirm. Nothing is judged until you do.", "Sample invitation created for this demo, not a real event."],
  ["s4", M.s4_outfit, M.s5_findings, 12, null, "Then add one full-length photo, with consent.", "Photo: Brooke Cagle / Unsplash (CC0). The person shown has not reviewed this AI preview."],
  ["s5", M.s5_findings, M.s6_options, 18, [M.w_gemini_outfit_start, M.w_gemini_outfit_end, "Gemini reading"], "Each finding names the rule behind it. Here, boots don't match the request for flats or wedges on a lawn.", null],
  ["s6", M.s6_options, M.s7_render, 10, null, "Choose one alternative. It's a visual reference, not a shopping listing.", null],
  ["s7", M.s7_render, M.s8_decision, 19, [M.w_render_start, M.w_render_end, "YouCam render"], "YouCam renders it onto the photo, live. It shows the idea of the change, not fit, size or comfort.", "Real YouCam Shoes V3 render on the live site."],
  ["s8", M.s8_decision, M.s9_end, 12, null, "You decide, and download a decision card. Keeping your outfit is a complete answer too.", null],
  ["s9", M.s9_end + 1.5, M.end, 8, null, "WearCheck. An outfit you own. An occasion to get right.", null],
];
const total = scenes.reduce((s, x) => s + x[3], 0);
if (total !== 120) throw new Error(`scene targets sum to ${total}, not 120`);

// Build the cut list: pieces of [rawStart, rawEnd, speed].
const pieces = [];
const timeline = []; // final-time info per scene
const notes = [];
let tFinal = 0;
for (const [id, s, e, target, wait, , note] of scenes) {
  const start = tFinal;
  if (!wait) {
    if (e - s < target) throw new Error(`${id}: raw ${(e - s).toFixed(1)}s shorter than ${target}s`);
    pieces.push([s, s + target, 1]);
  } else {
    const [w0, w1, what] = wait;
    const before = w0 - s;
    let after = e - w1;
    const waitAlloc = Math.max(3, target - before - after);
    after = Math.max(0, target - before - waitAlloc);
    if (before > 0.05) pieces.push([s, w0, 1]);
    const speed = (w1 - w0) / waitAlloc;
    pieces.push([w0, w1, speed]);
    if (after > 0.05) pieces.push([w1, w1 + after, 1]);
    notes.push([start + before, start + before + waitAlloc, `${what} sped up ×${speed.toFixed(1)} (actual ${(w1 - w0).toFixed(1)} s)`]);
  }
  timeline.push({ id, start, end: start + target });
  if (note) notes.push([start, start + target, note]);
  tFinal += target;
}

// Voiceover: one WAV per scene from the Windows speech synthesiser.
const voice = [];
for (const [i, sc] of scenes.entries()) {
  const wav = resolve(work, `vo-${sc[0]}.wav`);
  const text = sc[5].replace(/'/g, "''");
  execFileSync("powershell.exe", ["-NoProfile", "-Command", `Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('Microsoft Zira Desktop'); $s.Rate=1; $s.SetOutputToWaveFile('${wav}'); $s.Speak('${text}'); $s.Dispose()`]);
  voice.push({ wav, at: timeline[i].start + 0.4 });
}
const durOf = (file) => {
  try { execFileSync(ffmpeg, ["-hide_banner", "-i", file], { stdio: "pipe" }); } catch (e) {
    const m = String(e.stderr).match(/Duration: (\d+):(\d+):([\d.]+)/);
    return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
  }
  return 0;
};
for (const [i, v] of voice.entries()) {
  const d = durOf(v.wav);
  v.duration = d;
  const room = scenes[i][3] - 0.6;
  if (d > room) throw new Error(`voiceover for ${scenes[i][0]} is ${d.toFixed(1)}s, scene allows ${room.toFixed(1)}s`);
}

// Captions (voiceover text) and notes as ASS subtitles.
const ts = (t) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = (t % 60).toFixed(2).padStart(5, "0"); return `${h}:${String(m).padStart(2, "0")}:${s}`; };
const esc = (t) => t.replace(/\n/g, "\\N");
let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Segoe UI,30,&H00F3EEE5,&H00F3EEE5,&H00171819,&HB4171819,1,0,0,0,100,100,0,0,3,12,0,2,120,120,34,1
Style: Note,Segoe UI,21,&H00171819,&H00171819,&H00E5EEF3,&H18E5EEF3,1,0,0,0,100,100,0,0,3,8,0,9,40,40,86,1
Style: Stamp,Segoe UI,17,&H00F3EEE5,&H00F3EEE5,&H00171819,&H64171819,0,0,0,0,100,100,0,0,3,6,0,7,24,24,86,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
for (const [i, v] of voice.entries()) ass += `Dialogue: 0,${ts(v.at)},${ts(Math.min(timeline[i].end - 0.1, v.at + v.duration + 0.6))},Caption,,0,0,0,,${esc(scenes[i][5])}\n`;
for (const [a, b, text] of notes) ass += `Dialogue: 1,${ts(a)},${ts(b)},Note,,0,0,0,,${esc(text)}\n`;
ass += `Dialogue: 2,${ts(0)},${ts(120)},Stamp,,0,0,0,,Recorded on wearcheck.vercel.app · 1 Nov 2026\n`;
const assPath = join(work, "captions.ass");
writeFileSync(assPath, ass);

// Video: trim + retime each piece, concatenate, burn subtitles. Audio: voice clips at their offsets.
const vf = pieces.map(([a, b, sp], i) => `[0:v]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=(PTS-STARTPTS)/${sp.toFixed(4)},fps=30[v${i}]`);
const concat = `${pieces.map((_, i) => `[v${i}]`).join("")}concat=n=${pieces.length}:v=1:a=0[vc]`;
const subs = `[vc]subtitles='${assPath.replace(/\\/g, "/").replace(/:/g, "\\:")}',trim=duration=120,setpts=PTS-STARTPTS[vout]`;
const af = voice.map((v, i) => `[${i + 1}:a]adelay=${Math.round(v.at * 1000)}|${Math.round(v.at * 1000)},aformat=sample_rates=48000:channel_layouts=stereo[a${i}]`);
const mix = `${voice.map((_, i) => `[a${i}]`).join("")}amix=inputs=${voice.length}:normalize=0,apad,atrim=duration=120[aout]`;
const outFile = join(dirname(raw), "wearcheck-demo-120s.mp4");
const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", raw, ...voice.flatMap((v) => ["-i", v.wav]), "-filter_complex", [...vf, concat, subs, ...af, mix].join(";"), "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-t", "120", "-movflags", "+faststart", outFile];
execFileSync(ffmpeg, args, { stdio: "inherit" });
writeFileSync(join(dirname(raw), "wearcheck-demo-120s.json"), JSON.stringify({ raw, pieces, timeline, notes, voice: voice.map((v) => ({ at: v.at, duration: v.duration })) }, null, 2));
console.log("wrote", outFile);
