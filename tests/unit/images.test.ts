import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { normalizeImage } from "@/lib/images";

describe("real image decoding and private metadata", () => {
  it("rejects spoofed formats, damaged files, blank images and undersized references", async () => {
    await expect(normalizeImage(Buffer.from("not an image despite .jpg"), "reference_upload")).rejects.toMatchObject({ code: "UNSUPPORTED_FORMAT" });
    await expect(normalizeImage(Buffer.from([255,216,255,...Array(40).fill(0)]), "outfit")).rejects.toMatchObject({ code: "FILE_UNREADABLE" });
    const blank = await sharp({ create: { width: 600, height: 600, channels: 3, background: "white" } }).jpeg().toBuffer();
    await expect(normalizeImage(blank, "reference_upload")).rejects.toMatchObject({ code: "FILE_BLANK" });
    const small = await sharp(readFileSync("public/reference/top-blue-shirt.jpg")).resize(200,200).jpeg().toBuffer();
    await expect(normalizeImage(small, "reference_upload")).rejects.toMatchObject({ code: "IMAGE_TOO_SMALL" });
  });
  it("normalizes orientation, bounds dimensions, retains the whole frame and strips EXIF", async () => {
    const source = await sharp(readFileSync("public/reference/top-blue-shirt.jpg")).resize(2400,2400).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const normalized = await normalizeImage(source, "reference_upload");
    const metadata = await sharp(normalized.bytes).metadata();
    expect([metadata.width,metadata.height]).toEqual([2048,2048]);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
    expect(normalized.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
