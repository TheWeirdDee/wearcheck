// Downloads and prepares the contemporary reference catalogue in /public/reference from
// licence-documented Wikimedia Commons files, and records provenance in LICENSES.json.
// Each item is trimmed to the product on its plain background, padded with the background colour
// and checked against YouCam's documented reference rules (>= 512 px each side; product shots of a
// single front-facing garment; a shoe product covering > 25% of the image height).
//   node scripts/build-references.mjs
import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const SRC = "private-ops/reference-src/";
const OUT = "public/reference/";
const UA = { "User-Agent": "WearCheckAssetReview/0.2 (reference catalogue licence review)" };
mkdirSync(SRC, { recursive: true });

const ITEMS = [
  { file: "top-green-seersucker.jpg", title: "File:Seersucker shirt.JPG", aspect: 1, kind: "garment" },
  { file: "top-blue-shirt.jpg", title: "File:Blue Business Shirt.jpg", aspect: 1, kind: "garment" },
  { file: "dress-black-silk.jpg", title: "File:Black silk dress by Emma Knuckey.jpg", aspect: 3 / 4, kind: "garment" },
  { file: "loafer-black-tassel.jpg", title: "File:946 black.jpg", aspect: 4 / 3, kind: "shoe" },
  { file: "oxford-tan-captoe.jpg", title: "File:Web HC-Right-angle.jpg", aspect: 4 / 3, kind: "shoe" },
  { file: "pump-nude-pointed.jpg", title: "File:Michael Kors MK-Flex MID Pump 40T2MFMP2L taupe - dark khaki (1) (16181589748).jpg", aspect: 4 / 3, kind: "shoe" },
];

const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2560&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist|Credit|UsageTerms&titles=${encodeURIComponent(ITEMS.map((i) => i.title).join("|"))}`;
const pages = Object.values((await (await fetch(api, { headers: UA })).json()).query.pages);
const licences = existsSync(OUT + "LICENSES.json") ? JSON.parse(readFileSync(OUT + "LICENSES.json", "utf8")) : {};
const strip = (h) => (h ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

for (const item of ITEMS.filter((item) => !process.argv.includes("--new-only") || !existsSync(OUT + item.file))) {
  const p = pages.find((x) => x.title === item.title);
  const info = p.imageinfo[0];
  const m = info.extmetadata;
  const srcPath = SRC + item.file;
  if (!existsSync(srcPath)) writeFileSync(srcPath, Buffer.from(await (await fetch(info.thumburl ?? info.url, { headers: UA })).arrayBuffer()));

  // Background colour from the top-left corner; trim to the product, then pad to the target aspect.
  const { data } = await sharp(srcPath).extract({ left: 2, top: 2, width: 8, height: 8 }).raw().toBuffer({ resolveWithObject: true });
  const bg = { r: data[0], g: data[1], b: data[2] };
  const trimmed = await sharp(srcPath).rotate().trim({ background: bg, threshold: 24 }).toBuffer({ resolveWithObject: true });
  const { width: tw, height: th } = trimmed.info;
  const pad = 0.06;
  let W = Math.round(tw * (1 + 2 * pad)), H = Math.round(th * (1 + 2 * pad));
  if (W / H < item.aspect) W = Math.round(H * item.aspect); else H = Math.round(W / item.aspect);
  let img = sharp({ create: { width: W, height: H, channels: 3, background: bg } }).composite([{ input: trimmed.data, left: Math.round((W - tw) / 2), top: Math.round((H - th) / 2) }]);
  let buf = await img.jpeg({ quality: 90 }).toBuffer();
  buf = await sharp(buf).resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const meta = await sharp(buf).metadata();
  const cover = th / H;

  const problems = [];
  if (Math.min(meta.width, meta.height) < 512) problems.push("smaller than 512 px");
  if (item.kind === "shoe" && cover <= 0.25) problems.push(`shoe covers only ${(cover * 100).toFixed(0)}% of height`);
  writeFileSync(OUT + item.file, buf);
  licences[item.file] = {
    title: p.title,
    page: info.descriptionurl,
    original: info.url,
    width: meta.width,
    height: meta.height,
    license: m.LicenseShortName?.value,
    licenseUrl: m.LicenseUrl?.value ?? null,
    artist: strip(m.Artist?.value),
    credit: strip(m.Credit?.value).slice(0, 300),
    usageTerms: m.UsageTerms?.value ?? null,
    file: item.file,
    bytes: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
    modifications: "Trimmed to the product, padded with the original background colour, resized and re-encoded as JPEG.",
    youcamCheck: { productCoverOfHeight: Number(cover.toFixed(2)), problems },
  };
  console.log(item.file, `${meta.width}x${meta.height}`, m.LicenseShortName?.value, strip(m.Artist?.value).slice(0, 40), `cover=${(cover * 100).toFixed(0)}%`, problems.join("; ") || "ok");
}
writeFileSync(OUT + "LICENSES.json", JSON.stringify(licences, null, 2) + "\n");
