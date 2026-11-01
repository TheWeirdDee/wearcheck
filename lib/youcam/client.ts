import "server-only";
import { env } from "../env";
import { AppError } from "../errors";

/**
 * Server-only YouCam (Perfect Corp) adapter. Verified against the live API on 2026-11-01:
 *  - Auth: `Authorization: Bearer <api key>` on https://yce-api-01.makeupar.com
 *  - File: POST /s2s/v2.0/file → data.files[0].{file_id, requests[0].{method,url,headers}} then PUT bytes
 *  - Clothes V4: POST /s2s/v2.0/task/cloth-v4, GET /s2s/v2.0/task/cloth-v4/{task_id}
 *  - Shoes V3:   POST /s2s/v2.0/task/shoes-transfer, GET /s2s/v2.0/task/shoes-transfer/{task_id}
 *    (V3 body has only src/ref file id-or-url; no gender/style fields)
 *  - Status: data.task_status ∈ running | success | error; data.results.url valid ~2h; data.error code.
 * The API key is never sent anywhere except the provider host. Provider IDs never reach the browser.
 */

export type Feature = "cloth-v4" | "shoes-transfer";
export const UNITS_PER_TASK: Record<Feature, number> = { "cloth-v4": 2, "shoes-transfer": 2 };

const TIMEOUT_MS = 30_000;
const MAX_RESULT_BYTES = 15 * 1024 * 1024;

/** SSRF guard: provider-issued URLs must be HTTPS on the provider's storage hosts. */
export function isAllowedProviderUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
  const h = u.hostname.toLowerCase();
  return h.endsWith(".amazonaws.com") || h.endsWith(".makeupar.com") || h.endsWith(".perfectcorp.com");
}

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${env().YOUCAM_API_BASE}${path}`, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Authorization: `Bearer ${env().YOUCAM_API_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, body: body as Record<string, unknown> | null, retryAfter: res.headers.get("retry-after") };
}

export class ProviderError extends AppError {
  constructor(code: string, message: string, status: number, retryable: boolean, public providerCode: string | null = null) {
    super(code, message, status, retryable, retryable ? "RETRY" : "CHOOSE_ANOTHER_ITEM");
  }
}

function httpError(status: number, body: Record<string, unknown> | null): ProviderError {
  const code = typeof body?.error_code === "string" ? body.error_code : typeof body?.error === "string" ? body.error : null;
  if (status === 401 || status === 403) return new ProviderError("PROVIDER_AUTH", "The preview service isn't available right now.", 503, false, code);
  if (status === 429) return new ProviderError("PROVIDER_BUSY", "The preview service is busy. Please try again in a minute.", 503, true, code);
  if (status === 402 || /credit|unit|quota|insufficient/i.test(String(code ?? ""))) return new ProviderError("PROVIDER_QUOTA", "WearCheck's preview allowance is used up for now.", 503, false, code);
  if (status >= 500) return new ProviderError("PROVIDER_DOWN", "The preview failed on the provider's side.", 502, true, code);
  return new ProviderError("PROVIDER_REJECTED", "The preview service couldn't accept that request.", 422, false, code);
}

/** Registers a file and uploads its bytes to the provider-issued signed URL. Returns the provider file_id. */
export async function uploadFile(bytes: Buffer, fileName: string, contentType: "image/jpeg" | "image/png"): Promise<string> {
  const r = await call("/s2s/v2.0/file", {
    method: "POST",
    body: JSON.stringify({ files: [{ content_type: contentType, file_name: fileName, file_size: bytes.length }] }),
  });
  if (r.status !== 200) throw httpError(r.status, r.body);
  const file = (r.body?.data as { files?: { file_id?: string; requests?: unknown }[] } | undefined)?.files?.[0];
  const reqs = file?.requests;
  const req = (Array.isArray(reqs) ? reqs[0] : reqs) as { method?: string; url?: string; headers?: Record<string, string> } | undefined;
  if (!file?.file_id || !req?.url || !isAllowedProviderUrl(req.url)) {
    throw new ProviderError("PROVIDER_MALFORMED", "The preview service returned an unexpected response.", 502, true);
  }
  const put = await fetch(req.url, {
    method: req.method === "POST" ? "POST" : "PUT",
    headers: req.headers ?? { "Content-Type": contentType, "Content-Length": String(bytes.length) },
    body: new Uint8Array(bytes),
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!put.ok) throw new ProviderError("PROVIDER_UPLOAD", "We couldn't send the image to the preview service.", 502, true);
  return file.file_id;
}

export type TaskInput =
  | { feature: "cloth-v4"; srcFileId: string; refFileId: string; garmentCategory: "full_body" | "upper_body" | "outer" | "lower_body" }
  | { feature: "shoes-transfer"; srcFileId: string; refFileId: string };

export async function createTask(input: TaskInput): Promise<string> {
  const body =
    input.feature === "cloth-v4"
      ? {
          src_file_id: input.srcFileId,
          ref_file_id: input.refFileId,
          garment_category: input.garmentCategory,
          // Keep the user's own shoes when changing a garment.
          ...(input.garmentCategory === "full_body" || input.garmentCategory === "lower_body" ? { change_shoes: false } : {}),
          filter_multi_person: "normal",
        }
      : { src_file_id: input.srcFileId, ref_file_id: input.refFileId };
  const r = await call(`/s2s/v2.0/task/${input.feature}`, { method: "POST", body: JSON.stringify(body) });
  if (r.status !== 200) throw httpError(r.status, r.body);
  const taskId = (r.body?.data as { task_id?: string } | undefined)?.task_id;
  if (!taskId) throw new ProviderError("PROVIDER_MALFORMED", "The preview service returned an unexpected response.", 502, true);
  return taskId;
}

export type TaskStatus =
  | { state: "running"; raw: string }
  | { state: "success"; url: string; raw: string }
  | { state: "error"; code: string | null; message: string | null; raw: string };

export async function getTask(feature: Feature, taskId: string): Promise<TaskStatus> {
  const r = await call(`/s2s/v2.0/task/${feature}/${encodeURIComponent(taskId)}`, { method: "GET" });
  if (r.status !== 200) throw httpError(r.status, r.body);
  const data = (r.body?.data ?? {}) as { task_status?: string; error?: string | null; error_message?: string | null; results?: { url?: string } | null; url?: string };
  const raw = String(data.task_status ?? "unknown");
  if (raw === "success") {
    const url = data.results?.url ?? data.url;
    if (!url || !isAllowedProviderUrl(url)) return { state: "error", code: "malformed_result", message: null, raw };
    return { state: "success", url, raw };
  }
  if (raw === "error") return { state: "error", code: data.error ?? null, message: data.error_message ?? null, raw };
  return { state: "running", raw };
}

/** Downloads a provider result into memory with host allowlist, size cap and timeout. */
export async function downloadResult(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  if (!isAllowedProviderUrl(url)) throw new ProviderError("PROVIDER_MALFORMED", "Unexpected result location.", 502, false);
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 403 || res.status === 404) throw new ProviderError("RESULT_EXPIRED", "The preview link expired before we could save it.", 410, true);
  if (!res.ok || !res.body) throw new ProviderError("RESULT_DOWNLOAD", "We couldn't save the preview. Please try again.", 502, true);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_RESULT_BYTES) throw new ProviderError("RESULT_TOO_LARGE", "The preview was unexpectedly large.", 502, false);
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESULT_BYTES) {
      await reader.cancel();
      throw new ProviderError("RESULT_TOO_LARGE", "The preview was unexpectedly large.", 502, false);
    }
    chunks.push(value);
  }
  return { bytes: Buffer.concat(chunks), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
}

/** User-facing mapping of provider engine error codes (from the Clothes/Shoes "File Specs & Errors" pages). */
export function describeEngineError(code: string | null): { userCode: string; message: string; action: "RETAKE_PHOTO" | "CHOOSE_ANOTHER_ITEM" | "RETRY" } {
  switch (code) {
    case "error_pose":
    case "error_invalid_src":
    case "error_no_face":
    case "error_multi_person":
    case "error_face_parsing":
    case "error_apply_region_mismatch":
      return { userCode: "PHOTO_UNUSABLE", message: "We couldn't use that photo for a preview. A front-facing, well-lit photo of one person standing works best.", action: "RETAKE_PHOTO" };
    case "error_invalid_ref":
      return { userCode: "REFERENCE_UNCLEAR", message: "The reference item wasn't clear enough for the preview engine.", action: "CHOOSE_ANOTHER_ITEM" };
    case "error_editing_failed":
      return { userCode: "PREVIEW_NO_CHANGE", message: "The preview came back almost unchanged, so we didn't keep it.", action: "CHOOSE_ANOTHER_ITEM" };
    case "error_nsfw_content_detected":
    case "exceed_nsfw_retry_limits":
      return { userCode: "PREVIEW_BLOCKED", message: "The preview was blocked by the provider's content filter.", action: "RETAKE_PHOTO" };
    case "exceed_max_filesize":
    case "error_exceed_max_image_size":
    case "error_below_min_image_size":
    case "error_decode_image":
      return { userCode: "PHOTO_SIZE", message: "The preview engine couldn't accept the image size.", action: "RETAKE_PHOTO" };
    default:
      return { userCode: "PREVIEW_FAILED", message: "The preview failed on the provider's side.", action: "RETRY" };
  }
}

export async function creditBalance(): Promise<number | null> {
  const r = await call("/s2s/v1.0/client/credit", { method: "GET" });
  if (r.status !== 200) return null;
  const results = (r.body?.results ?? []) as { amount_dec?: number; amount?: number }[];
  return results.reduce((s, x) => s + Number(x.amount_dec ?? x.amount ?? 0), 0);
}
