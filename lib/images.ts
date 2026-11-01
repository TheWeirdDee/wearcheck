import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { AppError } from "./errors";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel request bodies are capped at 4.5 MB; the client downsizes first.
export const MAX_PIXELS = 40_000_000;

export type AssetKind = "invitation" | "outfit" | "reference_upload";

const RULES: Record<AssetKind, { minShort: number; minLong: number; maxLong: number }> = {
  // YouCam: long side <= 4096; recommended >= 1024x768; minimum 512x384 (clothes), 512x512 (shoes).
  outfit: { minShort: 512, minLong: 768, maxLong: 2048 },
  reference_upload: { minShort: 512, minLong: 512, maxLong: 2048 },
  invitation: { minShort: 300, minLong: 400, maxLong: 2048 },
};

export type NormalizedImage = {
  bytes: Buffer;
  mime: "image/jpeg";
  width: number;
  height: number;
  sha256: string;
};

function sniff(buf: Buffer): "jpeg" | "png" | "webp" | "heif" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buf.subarray(4, 8).toString("ascii") === "ftyp" && /hei|mif|avif/.test(buf.subarray(8, 12).toString("ascii"))) return "heif";
  return null;
}

/**
 * Validates real file content (magic bytes + full decode), applies EXIF orientation,
 * strips all metadata (including GPS), bounds dimensions, and re-encodes to JPEG.
 * No beautification, colour grading or face changes.
 */
export async function normalizeImage(buf: Buffer, kind: AssetKind): Promise<NormalizedImage> {
  if (buf.length === 0) throw new AppError("FILE_EMPTY", "That file is empty. Please choose another image.", 400, true, "REPLACE_FILE");
  if (buf.length > MAX_UPLOAD_BYTES) throw new AppError("FILE_TOO_LARGE", "That image is larger than 4 MB after preparation. Please choose a smaller photo.", 413, true, "REPLACE_FILE");
  const type = sniff(buf);
  if (type === "heif") throw new AppError("UNSUPPORTED_FORMAT", "HEIC photos can't be read on our server. Your browser normally converts them; if not, export the photo as JPG or PNG.", 415, true, "REPLACE_FILE");
  if (!type) throw new AppError("UNSUPPORTED_FORMAT", "Please use a JPG, PNG or WebP image.", 415, true, "REPLACE_FILE");

  let meta: sharp.Metadata;
  try {
    meta = await sharp(buf, { limitInputPixels: MAX_PIXELS, failOn: "error" }).metadata();
  } catch {
    throw new AppError("FILE_UNREADABLE", "We couldn't open that image. It may be damaged; please try another.", 422, true, "REPLACE_FILE");
  }
  if (!meta.width || !meta.height) throw new AppError("FILE_UNREADABLE", "We couldn't read that image's size.", 422, true, "REPLACE_FILE");

  const rotated = (meta.orientation ?? 1) >= 5;
  const w = rotated ? meta.height : meta.width;
  const h = rotated ? meta.width : meta.height;
  const r = RULES[kind];
  if (Math.min(w, h) < r.minShort || Math.max(w, h) < r.minLong) {
    throw new AppError(
      "IMAGE_TOO_SMALL",
      `This image is ${w}×${h}px. Please use one at least ${r.minShort}px on the short side${kind === "outfit" ? " (1024px or more works best)" : ""}.`,
      422,
      true,
      kind === "outfit" ? "RETAKE_PHOTO" : "REPLACE_FILE",
    );
  }

  let out: { data: Buffer; info: sharp.OutputInfo };
  try {
    out = await sharp(buf, { limitInputPixels: MAX_PIXELS, failOn: "error" })
      .rotate()
      .resize({ width: r.maxLong, height: r.maxLong, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new AppError("FILE_UNREADABLE", "We couldn't process that image. Please try another.", 422, true, "REPLACE_FILE");
  }

  const stats = await sharp(out.data).stats();
  const flat = stats.channels.every((c) => c.stdev < 4);
  if (flat) throw new AppError("FILE_BLANK", "That image looks blank. Please choose a photo with visible content.", 422, true, "REPLACE_FILE");

  return {
    bytes: out.data,
    mime: "image/jpeg",
    width: out.info.width,
    height: out.info.height,
    sha256: createHash("sha256").update(out.data).digest("hex"),
  };
}

export async function thumbnail(buf: Buffer, size = 512) {
  return sharp(buf).resize({ width: size, height: size, fit: "inside" }).jpeg({ quality: 82 }).toBuffer();
}
