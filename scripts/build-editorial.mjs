// Builds the editorial image set in /public/editorial from CC0 sources downloaded into
// private-ops/editorial-src (see public/editorial/LICENSES.json for origin and licence).
// Editorial images illustrate scenarios only: they are never sent to YouCam or Gemini and are
// never presented as a WearCheck result.
//   node scripts/build-editorial.mjs
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SRC = "private-ops/editorial-src/";
const OUT = "public/editorial/";
const meta = JSON.parse(readFileSync(SRC + "meta.json", "utf8"));
// One shared grade so photos from different shoots read as a set: slightly muted, slightly warm.
const grade = (img) => img.modulate({ saturation: 0.8, brightness: 1.01 }).recomb([[1.03, 0.02, 0], [0.01, 1.0, 0], [0, 0.02, 0.95]]);

const jobs = [
  { out: "hero-brick-wall.jpg", src: "man-in-front-of-brick-wall.jpg", crop: { left: 1000, top: 560, width: 1600, height: 2000 }, note: "Cropped to 4:5 around the subject; colour graded." },
  { out: "guide-feet-cropped.jpg", src: "man-in-front-of-brick-wall.jpg", crop: { left: 1140, top: 560, width: 1320, height: 1650 }, note: "Cropped above the ankles to illustrate a photo that hides the feet; colour graded." },
  { out: "guide-low-light.jpg", src: "man-in-front-of-brick-wall.jpg", crop: { left: 1000, top: 560, width: 1600, height: 2000 }, dark: true, note: "Darkened and softened to illustrate poor lighting (simulated, not an original photo condition)." },
  { out: "guide-two-people.jpg", src: "cubanspirit.jpg", crop: { left: 1250, top: 0, width: 2048, height: 2560 }, note: "Cropped to 4:5; colour graded." },
  { out: "story-colonnade.jpg", src: "exploring-at-paris-fashion-week-aw17.jpg", note: "Resized; colour graded." },
  { out: "story-jumpsuit.jpg", src: "turquoise-jumpsuit.jpg", crop: { left: 0, top: 0, width: 3830, height: 4788 }, note: "Cropped to 4:5 from the top; colour graded." },
  { out: "example-street.jpg", src: "woman-with-to-go-coffee.jpg", crop: { left: 0, top: 0, width: 3840, height: 4800 }, note: "Cropped to 4:5 from the top; colour graded." },
  { out: "example-evening.jpg", src: "two-elegant-men-near-a-wall.jpg", note: "Resized; contrast unchanged (black and white original)." },
  { out: "editorial-white-wall.jpg", src: "faux-fur-shawl.jpg", crop: { left: 0, top: 480, width: 3840, height: 4800 }, note: "Cropped to 4:5; colour graded." },
];

const licences = {};
for (const j of jobs) {
  let img = sharp(SRC + j.src).rotate();
  if (j.crop) img = img.extract(j.crop);
  img = img.resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true });
  img = grade(img);
  if (j.dark) img = img.modulate({ brightness: 0.42, saturation: 0.7 }).linear(0.75, 18).blur(1.2);
  const buf = await img.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  writeFileSync(OUT + j.out, buf);
  const m = meta[j.src];
  const { width, height } = await sharp(buf).metadata();
  licences[j.out] = {
    kind: "editorial",
    use: "Marketing and guidance illustration only. Not user data, not provider-test evidence, not a WearCheck or YouCam output.",
    title: m.title, page: m.page, originalUnsplash: m.credit.match(/https:\/\/unsplash\.com\/photos\/[\w-]+/)?.[0] ?? null,
    photographer: m.artist, license: m.license, licenseUrl: m.licenseUrl, usageTerms: m.usageTerms,
    width, height, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex"), modifications: j.note,
  };
  console.log(j.out, width + "x" + height, (buf.length / 1024) | 0, "KB");
}
writeFileSync(OUT + "LICENSES.json", JSON.stringify(licences, null, 2) + "\n");
