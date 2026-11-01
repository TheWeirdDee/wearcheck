// Uploads permissioned demo photos into the private WearCheck bucket as demo/<slug>.jpg.
//   node scripts/upload-demo-assets.mjs <slug> <path-to-photo>   (slug: garden-wedding-shoes | no-white-ivory | compatible-keep)
// Only run this for photos whose subject is an adult who has given documented permission.
// The photo is normalised (EXIF orientation applied, metadata stripped, max 2048px JPEG) before upload.
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.mjs";

loadEnv();
const SLUGS = ["garden-wedding-shoes", "no-white-ivory", "compatible-keep"];
const [slug, file] = process.argv.slice(2);
if (!SLUGS.includes(slug) || !file) {
  console.error(`usage: upload-demo-assets.mjs <${SLUGS.join("|")}> <photo>`);
  process.exit(2);
}
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "wearcheck-private";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: b } = await sb.storage.getBucket(bucket);
if (!b) {
  const { error } = await sb.storage.createBucket(bucket, { public: false, fileSizeLimit: 10 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png"] });
  if (error) throw error;
} else if (b.public) throw new Error("bucket is public — refusing");

const bytes = await sharp(readFileSync(file)).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
const meta = await sharp(bytes).metadata();
const { error } = await sb.storage.from(bucket).upload(`demo/${slug}.jpg`, bytes, { contentType: "image/jpeg", upsert: true });
if (error) throw error;
mkdirSync("private-ops", { recursive: true });
appendFileSync("private-ops/demo-assets.jsonl", JSON.stringify({ slug, at: new Date().toISOString(), width: meta.width, height: meta.height, sha256: createHash("sha256").update(bytes).digest("hex"), permission: "confirmed by project owner" }) + "\n");
console.log(`uploaded demo/${slug}.jpg (${meta.width}×${meta.height}) to private bucket ${bucket}`);
