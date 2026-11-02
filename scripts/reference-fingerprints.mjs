import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const manifest = {};
for (const file of readdirSync("public/reference").filter((f) => /\.(jpg|png)$/.test(f)).sort()) {
  const bytes = readFileSync(`public/reference/${file}`);
  const pixels = await sharp(bytes).flatten({ background: "white" }).resize(9, 8, { fit: "fill" }).greyscale().raw().toBuffer();
  let hash = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) hash = (hash << 1n) | BigInt(pixels[y * 9 + x] > pixels[y * 9 + x + 1]);
  manifest[file] = { sha256: createHash("sha256").update(bytes).digest("hex"), dhash: hash.toString(16).padStart(16, "0") };
}
writeFileSync("public/reference/fingerprints.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Fingerprinted ${Object.keys(manifest).length} actual reference images.`);
