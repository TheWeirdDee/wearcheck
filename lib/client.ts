"use client";

export type ApiErrorBody = { code: string; message: string; retryable: boolean; action: string };

export class ClientApiError extends Error {
  constructor(public status: number, public body: ApiErrorBody) {
    super(body.message);
  }
}

/** JSON fetch that surfaces the server's error envelope. */
export async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) } });
  } catch {
    throw new ClientApiError(0, { code: "OFFLINE", message: "You appear to be offline. Your check is saved — reconnect and try again.", retryable: true, action: "RETRY" });
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const env = (data as { error?: ApiErrorBody } | null)?.error;
    throw new ClientApiError(res.status, env ?? { code: "HTTP_" + res.status, message: "Something went wrong. Please try again.", retryable: true, action: "RETRY" });
  }
  return data as T;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", ""];

/**
 * Client-side preflight: checks type/size, decodes with EXIF orientation applied, downsizes to
 * at most `maxSide` and re-encodes as JPEG so uploads stay under the 4 MB server limit.
 * HEIC works only where the browser itself can decode it (e.g. Safari); otherwise we say so.
 */
export async function prepareImage(file: File, maxSide = 2048): Promise<{ blob: Blob; width: number; height: number; previewUrl: string }> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    throw new Error("PDF invitations aren't supported yet. Take a screenshot of the invitation, or enter the details yourself.");
  }
  if (!ACCEPTED.includes(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error("Please choose a JPG, PNG or WebP image.");
  }
  if (file.size === 0) throw new Error("That file is empty.");
  if (file.size > 40 * 1024 * 1024) throw new Error("That file is over 40 MB. Please choose a smaller image.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(/heic|heif/i.test(file.type + file.name) ? "This browser can't open HEIC photos. Export it as JPG or take a screenshot." : "We couldn't open that image. It may be damaged.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  let quality = 0.9;
  let blob: Blob | null = null;
  for (let i = 0; i < 4; i++) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size < 3.8 * 1024 * 1024) break;
    quality -= 0.12;
  }
  if (!blob) throw new Error("We couldn't prepare that image.");
  return { blob, width: w, height: h, previewUrl: URL.createObjectURL(blob) };
}
