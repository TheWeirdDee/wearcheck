import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata } from "sharp";
import { catalogueItem, optionsFor } from "./catalogue";
import { type CheckRow, type AssessmentRow, currentRequirements, saveAsset, trackEvent } from "./checks";
import { db } from "./db";
import { env } from "./env";
import { AppError } from "./errors";
import { log } from "./log";
import { getObject } from "./storage";
import { RenderCategory } from "./schemas";
import { createTask, describeEngineError, downloadResult, getTask, ProviderError, UNITS_PER_TASK, uploadFile, type Feature } from "./youcam/client";

/**
 * Render job state machine (PRD §10.3):
 * draft → validating → uploading_source → uploading_reference → submitted → processing → persisting_result → completed
 * terminal: failed | expired. `delayed` is a non-terminal label for slow provider tasks.
 *
 * Guarantees:
 *  - identical requests (same check, assessment, photo, reference, attempt) map to one row via a unique idempotency key
 *  - at most one active job per check; new paid attempts only on an explicit user retry
 *  - admission (active-job check, spend caps, insert) runs in one transaction under an advisory lock,
 *    so two different simultaneous requests can't both pass the checks
 *  - if YouCam may have accepted a task whose id we never received, the job says so ("outcome unknown")
 *  - provider polling is lease-protected and throttled so concurrent pollers can't double-persist
 */

export type JobStatus =
  | "draft" | "validating" | "uploading_source" | "uploading_reference" | "submitted" | "processing"
  | "delayed" | "persisting_result" | "completed" | "failed" | "expired";

export const ACTIVE: JobStatus[] = ["draft", "validating", "uploading_source", "uploading_reference", "submitted", "processing", "delayed", "persisting_result"];
const POLLABLE: JobStatus[] = ["submitted", "processing", "delayed", "persisting_result"];

export type JobRow = {
  id: string; check_id: string; assessment_id: string; finding_id: string | null; feature: Feature; garment_category: string | null;
  catalogue_item_id: string | null; user_ref_asset_id: string | null; source_asset_id: string; input_revision: string;
  idempotency_key: string; attempt: number; status: JobStatus; provider_task_id: string | null; provider_status: string | null;
  result_asset_id: string | null; error_code: string | null; error_message: string | null; lease_until: Date | null;
  last_polled_at: Date | null; submitted_at: Date | null; completed_at: Date | null; created_at: Date; updated_at: Date;
};

const DELAYED_AFTER_MS = 4 * 60_000;
const GIVE_UP_AFTER_MS = 20 * 60_000; // provider says task results are queryable for 24h; links last ~2h
const POLL_THROTTLE_SEC = 8;

export type RenderRequest = {
  check: CheckRow;
  assessment: AssessmentRow;
  findingId: string;
  reference: { kind: "catalogue"; itemId: string } | { kind: "user"; assetId: string; category: RenderCategory };
  explicitRetry: boolean;
};

const featureFor = (cat: RenderCategory): Feature => (cat === "shoes" ? "shoes-transfer" : "cloth-v4");

export async function requestRender(r: RenderRequest): Promise<JobRow> {
  // Either a finding with a render category, or an optional "explore alternatives" preview (voluntary:<category>).
  const voluntary = r.findingId.startsWith("voluntary:") ? RenderCategory.safeParse(r.findingId.slice(10)) : null;
  const finding = voluntary?.success
    ? { id: null as string | null, render_category: voluntary.data }
    : r.assessment.findings_json.findings.find((f) => f.id === r.findingId);
  if (!finding || !finding.render_category) throw new AppError("NOT_RENDERABLE", "That finding doesn't have a preview option.", 400);
  const findingRuleId = voluntary?.success ? null : (finding as { rule_id?: string | null }).rule_id ?? null;
  if (r.assessment.superseded_at) throw new AppError("STALE_ASSESSMENT", "Your requirements or photo changed. Please review the updated assessment first.", 409, true, "EDIT_REQUIREMENTS");

  let category: RenderCategory;
  let refKey: string;
  if (r.reference.kind === "catalogue") {
    const item = catalogueItem(r.reference.itemId);
    if (!item) throw new AppError("UNKNOWN_ITEM", "That reference item isn't available.", 400, false, "CHOOSE_ANOTHER_ITEM");
    category = item.category;
    refKey = `cat:${item.id}`;
    // Re-validate on the server: the item must still be an eligible correction under the confirmed requirements.
    const reqs = await currentRequirements(r.check);
    if (!reqs || !optionsFor({ render_category: finding.render_category, rule_id: findingRuleId }, reqs.json).some((c) => c.id === item.id)) {
      throw new AppError("ITEM_NOT_ELIGIBLE", "That reference doesn't meet your confirmed requirements. Please choose another item or upload your own.", 400, false, "CHOOSE_ANOTHER_ITEM");
    }
  } else {
    const rows = await db()`select id from wearcheck.media_assets where id = ${r.reference.assetId} and check_id = ${r.check.id} and kind = 'reference_upload'`;
    if (!rows[0]) throw new AppError("UNKNOWN_ITEM", "We couldn't find your uploaded item.", 400, false, "CHOOSE_ANOTHER_ITEM");
    category = r.reference.category;
    refKey = `user:${r.reference.assetId}`;
  }
  if (category !== finding.render_category) {
    throw new AppError("CATEGORY_MISMATCH", "That item doesn't address this finding. Please choose an item of the matching type.", 400, false, "CHOOSE_ANOTHER_ITEM");
  }
  if (category === "shoes" && !r.assessment.findings_json.shoes_assessable) {
    throw new AppError("PHOTO_FEET_NOT_VISIBLE", "We need to see your shoes for a shoe preview.", 422, true, "RETAKE_PHOTO");
  }

  const sql = db();
  const inputRevision = `${r.assessment.id}|${r.check.photo_asset_id}|${refKey}`;
  const prior = await sql`select * from wearcheck.render_jobs where check_id = ${r.check.id} and input_revision = ${inputRevision} order by attempt desc limit 1`;
  const last = prior[0] as unknown as JobRow | undefined;
  if (last && (last.status !== "failed" || !r.explicitRetry)) return last; // duplicate click / back button / refresh

  const attempt = (last?.attempt ?? 0) + 1;
  const idem = createHash("sha256").update(`${r.check.id}|${inputRevision}|${attempt}`).digest("hex");
  const admitted = await sql.begin(async (tx) => {
    // One admission at a time: active-job and budget checks and the insert are atomic.
    await tx`select pg_advisory_xact_lock(hashtext('wearcheck:render-admission'))`;
    const [dupe] = await tx`select * from wearcheck.render_jobs where idempotency_key = ${idem}`;
    if (dupe) return dupe as unknown as JobRow; // concurrent duplicate submission
    const active = await tx`select id from wearcheck.render_jobs where check_id = ${r.check.id} and status = any(${ACTIVE}) limit 1`;
    if (active[0]) throw new AppError("RENDER_IN_PROGRESS", "A preview for this check is already running.", 409, true, "WAIT");

    // Bounded spend: per guest session and global per-day caps. Jobs still being sent count too.
    const [{ session_count }] = await tx`
      select count(*)::int as session_count from wearcheck.render_jobs j join wearcheck.checks c on c.id = j.check_id
      where c.guest_session_id = ${r.check.guest_session_id} and (j.provider_task_id is not null or j.status = any(${ACTIVE}) or j.error_code = 'SUBMIT_OUTCOME_UNKNOWN')`;
    if (session_count >= env().RENDER_LIMIT_PER_SESSION) {
      throw new AppError("RENDER_LIMIT_SESSION", `This session has used its ${env().RENDER_LIMIT_PER_SESSION} AI previews. Your assessment and decision card still work.`, 429, false, "NONE");
    }
    const [{ day_count }] = await tx`
      select (select count(*)::int from wearcheck.api_usage_events where provider = 'youcam' and created_at > now() - interval '24 hours' and status <> 'not_submitted')
           + (select count(*)::int from wearcheck.render_jobs where status = any(${["draft", "validating", "uploading_source", "uploading_reference"]})) as day_count`;
    if (day_count >= env().RENDER_LIMIT_GLOBAL_PER_DAY) {
      throw new AppError("RENDER_LIMIT_GLOBAL", "WearCheck has reached today's AI preview limit. Your assessment and decision card still work.", 429, false, "NONE");
    }
    const [row] = await tx`
      insert into wearcheck.render_jobs (check_id, assessment_id, finding_id, feature, garment_category, catalogue_item_id, user_ref_asset_id, source_asset_id, input_revision, idempotency_key, attempt, status, lease_until)
      values (${r.check.id}, ${r.assessment.id}, ${finding.id}, ${featureFor(category)}, ${category === "shoes" ? null : category},
              ${r.reference.kind === "catalogue" ? r.reference.itemId : null}, ${r.reference.kind === "user" ? r.reference.assetId : null},
              ${r.check.photo_asset_id}, ${inputRevision}, ${idem}, ${attempt}, 'validating', now() + interval '90 seconds')
      returning *`;
    return { fresh: row as unknown as JobRow };
  });
  if (!("fresh" in admitted)) return admitted;
  const job = admitted.fresh;
  await trackEvent(r.check.id, "render_submitted", { feature: job.feature, attempt });
  return submit(job, r.check.demo_case);
}

async function setJob(id: string, patch: Partial<Record<keyof JobRow, unknown>>) {
  const [row] = await db()`update wearcheck.render_jobs set ${db()(patch as Record<string, never>)}, updated_at = now() where id = ${id} returning *`;
  return row as unknown as JobRow;
}

async function referenceBytes(job: JobRow): Promise<Buffer> {
  if (job.catalogue_item_id) {
    const item = catalogueItem(job.catalogue_item_id);
    if (!item) throw new AppError("UNKNOWN_ITEM", "That reference item isn't available.", 400);
    return readFile(path.join(process.cwd(), "public", "reference", path.basename(item.file)));
  }
  const [a] = await db()`select storage_key from wearcheck.media_assets where id = ${job.user_ref_asset_id} and check_id = ${job.check_id}`;
  if (!a) throw new AppError("UNKNOWN_ITEM", "We couldn't find your uploaded item.", 400);
  return getObject(a.storage_key as string);
}

const UNKNOWN_MESSAGE = "We lost contact with YouCam while sending this preview, so we can't tell whether it was generated (and charged). Trying again starts a new paid preview.";

async function submit(job: JobRow, demoCase: string | null): Promise<JobRow> {
  let taskId: string | null = null;
  let creating = false;
  try {
    job = await setJob(job.id, { status: "uploading_source" });
    const [src] = await db()`select storage_key from wearcheck.media_assets where id = ${job.source_asset_id} and check_id = ${job.check_id}`;
    const srcFileId = await uploadFile(await getObject(src.storage_key as string), `src-${job.id}.jpg`, "image/jpeg");
    job = await setJob(job.id, { status: "uploading_reference" });
    const refFileId = await uploadFile(await referenceBytes(job), `ref-${job.id}.jpg`, "image/jpeg");
    // Durable marker: from here a crash or lost response means YouCam may have accepted the task.
    job = await setJob(job.id, { provider_status: "creating_task", lease_until: new Date(Date.now() + 90_000) });
    creating = true;
    taskId = await createTask(
      job.feature === "shoes-transfer"
        ? { feature: "shoes-transfer", srcFileId, refFileId }
        : { feature: "cloth-v4", srcFileId, refFileId, garmentCategory: job.garment_category as "full_body" | "upper_body" | "outer" },
    );
    await db()`insert into wearcheck.api_usage_events (render_job_id, check_id, provider, feature, units_estimated, status, provider_task_id, demo_case)
               values (${job.id}, ${job.check_id}, 'youcam', ${job.feature}, ${UNITS_PER_TASK[job.feature]}, 'submitted', ${taskId}, ${demoCase})`;
    log.info("render_submitted", { job: job.id, feature: job.feature, attempt: job.attempt });
    return await setJob(job.id, { status: "submitted", provider_task_id: taskId, submitted_at: new Date(), lease_until: null });
  } catch (e) {
    // A definite HTTP rejection from createTask means no task exists; a timeout, network error or
    // malformed reply after the request was sent leaves the outcome unknown.
    const definite = e instanceof ProviderError && e.code !== "PROVIDER_MALFORMED";
    const unknown = (creating && !taskId && !definite) || Boolean(taskId);
    const pe = e instanceof AppError ? e : new ProviderError("PROVIDER_DOWN", "The preview service couldn't be reached.", 502, true);
    const code = unknown ? "SUBMIT_OUTCOME_UNKNOWN" : pe.code;
    await db()`insert into wearcheck.api_usage_events (render_job_id, check_id, provider, feature, units_estimated, status, provider_task_id, demo_case)
               values (${job.id}, ${job.check_id}, 'youcam', ${job.feature}, ${unknown ? UNITS_PER_TASK[job.feature] : 0}, ${taskId ? "submitted" : unknown ? "unknown" : "not_submitted"}, ${taskId}, ${demoCase})`;
    log.warn("render_submit_failed", { job: job.id, code });
    await trackEvent(job.check_id, "render_failed", { code });
    return setJob(job.id, { status: "failed", error_code: code, error_message: unknown ? UNKNOWN_MESSAGE : pe.message, lease_until: null, provider_task_id: taskId });
  }
}

/**
 * Advances a job one step by polling the provider at most every few seconds.
 * Safe to call from page polls, after() and the cron reconciler; a DB lease makes it single-flight.
 */
export async function advanceJob(jobId: string): Promise<JobRow> {
  const sql = db();
  const leased = await sql`
    update wearcheck.render_jobs set lease_until = now() + interval '60 seconds'
    where id = ${jobId} and status = any(${POLLABLE})
      and (lease_until is null or lease_until < now())
      and (last_polled_at is null or last_polled_at < now() - make_interval(secs => ${POLL_THROTTLE_SEC}))
    returning *`;
  if (!leased[0]) {
    const [row] = await sql`select * from wearcheck.render_jobs where id = ${jobId}`;
    return reconcileStuckSubmission(row as unknown as JobRow);
  }
  let job = leased[0] as unknown as JobRow;
  try {
    const t = await getTask(job.feature, job.provider_task_id!);
    if (t.state === "running") {
      const age = Date.now() - new Date(job.submitted_at ?? job.created_at).getTime();
      if (age > GIVE_UP_AFTER_MS) {
        await sql`update wearcheck.api_usage_events set status = 'timeout' where render_job_id = ${job.id}`;
        return setJob(job.id, { status: "failed", error_code: "PROVIDER_TIMEOUT", error_message: "The preview took too long. It may still finish on the provider's side, but we stopped waiting.", provider_status: t.raw, last_polled_at: new Date(), lease_until: null });
      }
      return setJob(job.id, { status: age > DELAYED_AFTER_MS ? "delayed" : "processing", provider_status: t.raw, last_polled_at: new Date(), lease_until: null });
    }
    if (t.state === "error") {
      const d = describeEngineError(t.code);
      await sql`update wearcheck.api_usage_events set status = 'failed', latency_ms = ${Date.now() - new Date(job.submitted_at!).getTime()} where render_job_id = ${job.id}`;
      log.warn("render_provider_error", { job: job.id, provider_code: t.code ?? "none" });
      await trackEvent(job.check_id, "render_failed", { code: d.userCode });
      return setJob(job.id, { status: "failed", error_code: d.userCode, error_message: d.message, provider_status: `error:${t.code ?? "unknown"}`, last_polled_at: new Date(), lease_until: null });
    }
    // success → copy into private storage before the signed URL expires
    job = await setJob(job.id, { status: "persisting_result", provider_status: t.raw, last_polled_at: new Date() });
    const { bytes } = await downloadResult(t.url);
    let meta: Metadata;
    try {
      meta = await sharp(bytes, { failOn: "error" }).metadata();
    } catch {
      throw new ProviderError("RESULT_MALFORMED", "The preview image couldn't be read.", 502, false);
    }
    if (!meta.width || !meta.height || !["jpeg", "png"].includes(meta.format ?? "")) throw new ProviderError("RESULT_MALFORMED", "The preview image couldn't be read.", 502, false);
    const mime = meta.format === "png" ? "image/png" : "image/jpeg";
    const asset = await saveAsset(job.check_id, "render_result", { bytes, width: meta.width, height: meta.height, sha256: createHash("sha256").update(bytes).digest("hex"), mime }, `youcam:${job.feature}`);
    const latency = Date.now() - new Date(job.submitted_at!).getTime();
    await sql`update wearcheck.api_usage_events set status = 'completed', latency_ms = ${latency} where render_job_id = ${job.id}`;
    log.info("render_completed", { job: job.id, feature: job.feature, latency_ms: latency });
    await trackEvent(job.check_id, "render_completed", { feature: job.feature, latency_ms: latency });
    return setJob(job.id, { status: "completed", result_asset_id: asset.id, completed_at: new Date(), lease_until: null });
  } catch (e) {
    const code = e instanceof AppError ? e.code : "POLL_ERROR";
    if (e instanceof AppError && !e.retryable) {
      return setJob(job.id, { status: "failed", error_code: code, error_message: e.message, lease_until: null });
    }
    // Transient: keep the job recoverable (back to the pre-lease state) — never resubmit a paid task.
    log.warn("render_poll_transient", { job: job.id, code });
    const back: JobStatus = job.status === "persisting_result" ? "processing" : job.status;
    return setJob(job.id, { status: back, last_polled_at: new Date(), lease_until: null });
  }
}

/**
 * A submission that crashed mid-way (lease expired, no task id) is failed — never silently resubmitted.
 * If it crashed while creating the task, YouCam may have accepted it, so the outcome is reported as unknown.
 */
async function reconcileStuckSubmission(job: JobRow): Promise<JobRow> {
  if (["validating", "uploading_source", "uploading_reference", "draft"].includes(job.status) && job.lease_until && new Date(job.lease_until).getTime() < Date.now()) {
    if (job.provider_status === "creating_task") {
      await db()`insert into wearcheck.api_usage_events (render_job_id, check_id, provider, feature, units_estimated, status)
                 values (${job.id}, ${job.check_id}, 'youcam', ${job.feature}, ${UNITS_PER_TASK[job.feature]}, 'unknown')`;
      return setJob(job.id, { status: "failed", error_code: "SUBMIT_OUTCOME_UNKNOWN", error_message: UNKNOWN_MESSAGE, lease_until: null });
    }
    return setJob(job.id, { status: "failed", error_code: "SUBMIT_INTERRUPTED", error_message: "Sending the preview was interrupted before it reached YouCam. Nothing was generated; you can try again.", lease_until: null });
  }
  return job;
}

export async function jobsForCheck(checkId: string): Promise<JobRow[]> {
  const rows = await db()`select * from wearcheck.render_jobs where check_id = ${checkId} order by created_at desc`;
  return rows as unknown as JobRow[];
}

/** Public, browser-safe view of a job: no provider IDs, no storage keys, no URLs except our own media route. */
export function publicJob(j: JobRow, currentAssessmentId: string | null) {
  const timeline = [
    { key: "reference", label: "Reference ready", done: Boolean(j.provider_task_id) || ["uploading_reference", "submitted", "processing", "delayed", "persisting_result", "completed"].includes(j.status) },
    { key: "sent", label: "Sent to YouCam", done: Boolean(j.provider_task_id) },
    { key: "generating", label: "Generating preview", done: ["persisting_result", "completed"].includes(j.status) },
    { key: "saving", label: "Saving result", done: j.status === "completed" },
  ];
  return {
    id: j.id,
    status: j.status,
    feature: j.feature,
    category: j.feature === "shoes-transfer" ? "shoes" : j.garment_category,
    catalogueItemId: j.catalogue_item_id,
    userRefAssetId: j.user_ref_asset_id,
    attempt: j.attempt,
    findingId: j.finding_id,
    stale: currentAssessmentId !== null && j.assessment_id !== currentAssessmentId,
    resultUrl: j.status === "completed" && j.result_asset_id ? `/api/media/${j.result_asset_id}` : null,
    error: j.status === "failed" ? { code: j.error_code, message: j.error_message } : null,
    timeline,
    submittedAt: j.submitted_at,
    completedAt: j.completed_at,
  };
}
export type PublicJob = ReturnType<typeof publicJob>;
