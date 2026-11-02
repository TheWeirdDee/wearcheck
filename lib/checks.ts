import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { Errors } from "./errors";
import { type NormalizedImage } from "./images";
import { putObject, removeObjects } from "./storage";
import { currentGuest, GUEST_RETENTION_HOURS } from "./session";
import { limitInTransaction } from "./rate-limit";
import type { AssessmentResult, InvitationExtraction, OutfitObservation, Requirements, UserCorrections } from "./schemas";
import { ASSESSMENT_POLICY_VERSION } from "./schemas";

/**
 * Data access layer. Every function that returns check data first verifies that the
 * check belongs to the current guest session. A valid-looking UUID alone grants nothing.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

export type CheckRow = {
  id: string;
  guest_session_id: string;
  status: "active" | "decided" | "deleted";
  current_step: string;
  requirements_revision: number;
  photo_asset_id: string | null;
  demo_case: string | null;
  decision: "keep" | "change" | null;
  decision_render_job_id: string | null;
  created_at: Date;
  expires_at: Date;
};

export async function createCheck(guestId: string, demoCase: string | null = null, requestId: string | null = null): Promise<CheckRow> {
  const [row] = await db()`
    insert into wearcheck.checks (guest_session_id, demo_case, expires_at, create_request_id)
    values (${guestId}, ${demoCase}, now() + make_interval(hours => ${GUEST_RETENTION_HOURS}), ${requestId})
    on conflict (guest_session_id, create_request_id) where create_request_id is not null
    do update set create_request_id = excluded.create_request_id
    returning *`;
  return row as unknown as CheckRow;
}

/** One session admission lock protects both idempotent replays and quota accounting. */
export async function admitCheck(guestId: string, demoCase: string | null, requestId: string | null) {
  return db().begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${`wearcheck:create:${guestId}`}))`;
    if (requestId) {
      const [prior] = await tx`select * from wearcheck.checks where guest_session_id = ${guestId} and create_request_id = ${requestId}`;
      if (prior) {
        if (prior.status === "deleted" || new Date(prior.expires_at) <= new Date()) throw Errors.notFound();
        return { check: prior as unknown as CheckRow, replay: true };
      }
    }
    await limitInTransaction(tx, "createCheck", guestId, "new checks in this session");
    const [row] = await tx`insert into wearcheck.checks (guest_session_id, demo_case, expires_at, create_request_id)
      values (${guestId}, ${demoCase}, now() + make_interval(hours => ${GUEST_RETENTION_HOURS}), ${requestId}) returning *`;
    return { check: row as unknown as CheckRow, replay: false };
  });
}

/** Throws NOT_FOUND unless the check exists, is live, and belongs to the current guest. */
export async function requireOwnedCheck(checkId: string): Promise<CheckRow> {
  if (!isUuid(checkId)) throw Errors.notFound();
  const guest = await currentGuest();
  if (!guest) throw Errors.notFound();
  const rows = await db()`
    select * from wearcheck.checks
    where id = ${checkId} and guest_session_id = ${guest.id} and status <> 'deleted' and expires_at > now()`;
  if (!rows[0]) throw Errors.notFound();
  return rows[0] as unknown as CheckRow;
}

export async function setStep(checkId: string, step: string) {
  await db()`update wearcheck.checks set current_step = ${step}, updated_at = now() where id = ${checkId}`;
}

export type AssetRow = { id: string; check_id: string; kind: string; storage_key: string; mime: string; width: number; height: number; sha256: string; origin: string; created_at: Date };

export async function saveAsset(
  checkId: string,
  kind: "invitation" | "outfit" | "reference_upload" | "render_result",
  img: Pick<NormalizedImage, "bytes" | "width" | "height" | "sha256"> & { mime: "image/jpeg" | "image/png" },
  origin: string,
  consentId: string | null = null,
): Promise<AssetRow> {
  const id = randomUUID();
  const key = `checks/${checkId}/${kind}/${id}.${img.mime === "image/png" ? "png" : "jpg"}`;
  await putObject(key, img.bytes, img.mime);
  // The row is only written while the check is live. If the insert fails, or the check was deleted
  // meanwhile, the object is removed again so no unreferenced image is left behind.
  let row: AssetRow | undefined;
  try {
    [row] = (await db()`
      insert into wearcheck.media_assets (id, check_id, kind, storage_key, mime, width, height, bytes, sha256, origin, consent_record_id, expires_at)
      select ${id}, ${checkId}, ${kind}, ${key}, ${img.mime}, ${img.width}, ${img.height}, ${img.bytes.length}, ${img.sha256}, ${origin}, ${consentId}, c.expires_at
      from wearcheck.checks c where c.id = ${checkId} and c.status <> 'deleted'
      returning *`) as unknown as AssetRow[];
  } catch (e) {
    await removeObjects([key]).catch(() => {});
    throw e;
  }
  if (!row) {
    await removeObjects([key]).catch(() => {});
    throw Errors.notFound();
  }
  return row;
}

/** Ownership-checked asset lookup for the media route. */
export async function requireOwnedAsset(assetId: string): Promise<AssetRow> {
  if (!isUuid(assetId)) throw Errors.notFound();
  const guest = await currentGuest();
  if (!guest) throw Errors.notFound();
  const rows = await db()`
    select a.* from wearcheck.media_assets a
    join wearcheck.checks c on c.id = a.check_id
    where a.id = ${assetId} and c.guest_session_id = ${guest.id} and c.status <> 'deleted' and c.expires_at > now()`;
  if (!rows[0]) throw Errors.notFound();
  return rows[0] as unknown as AssetRow;
}

export type EventSourceRow = {
  id: string; source_type: string; asset_id: string | null; manual_json: unknown;
  extraction_json: InvitationExtraction | null; extraction_status: string; extraction_error: string | null; model_id: string | null;
};

export async function latestEventSource(checkId: string): Promise<EventSourceRow | null> {
  const rows = await db()`select * from wearcheck.event_sources where check_id = ${checkId} order by created_at desc limit 1`;
  return (rows[0] as unknown as EventSourceRow) ?? null;
}

export async function currentRequirements(check: CheckRow): Promise<{ revision: number; json: Requirements; model_id: string | null; confirmed_at: Date } | null> {
  if (check.requirements_revision === 0) return null;
  const rows = await db()`select revision, json, model_id, confirmed_at from wearcheck.event_requirements where check_id = ${check.id} and revision = ${check.requirements_revision}`;
  return (rows[0] as unknown as { revision: number; json: Requirements; model_id: string | null; confirmed_at: Date }) ?? null;
}

/** Confirms a new requirements revision and supersedes every assessment built on older revisions. */
export async function confirmRequirements(checkId: string, expectedRevision: number, json: Requirements, modelId: string | null) {
  return db().begin(async (sql) => {
    const [c] = await sql`select requirements_revision from wearcheck.checks where id = ${checkId} for update`;
    if (c.requirements_revision !== expectedRevision) return { ok: false as const, revision: c.requirements_revision as number };
    const next = (c.requirements_revision as number) + 1;
    await sql`insert into wearcheck.event_requirements (check_id, revision, json, model_id) values (${checkId}, ${next}, ${sql.json(json as never)}, ${modelId})`;
    await sql`update wearcheck.checks set requirements_revision = ${next}, decision = null, decision_render_job_id = null, status = 'active', updated_at = now() where id = ${checkId}`;
    await sql`update wearcheck.assessments set superseded_at = now() where check_id = ${checkId} and superseded_at is null`;
    return { ok: true as const, revision: next };
  });
}

export async function photoAsset(check: CheckRow): Promise<AssetRow | null> {
  if (!check.photo_asset_id) return null;
  const rows = await db()`select * from wearcheck.media_assets where id = ${check.photo_asset_id} and check_id = ${check.id}`;
  return (rows[0] as unknown as AssetRow) ?? null;
}

export type ObservationRow = { id: string; photo_asset_id: string; requirements_revision: number | null; json: OutfitObservation; user_corrections: UserCorrections; model_id: string; created_at: Date };

export async function latestObservation(checkId: string, photoAssetId: string, revision?: number): Promise<ObservationRow | null> {
  const rows = await db()`select * from wearcheck.outfit_observations where check_id = ${checkId} and photo_asset_id = ${photoAssetId} and (${revision ?? null}::integer is null or requirements_revision = ${revision ?? null}) order by created_at desc limit 1`;
  return (rows[0] as unknown as ObservationRow) ?? null;
}

export type AssessmentRow = {
  id: string; requirements_revision: number; photo_asset_id: string; observation_id: string; corrections_hash: string;
  status: string; findings_json: AssessmentResult; created_at: Date; superseded_at: Date | null;
};

/** The single current (non-superseded) assessment for the check's current revision and photo, if any. */
export async function currentAssessment(check: CheckRow): Promise<AssessmentRow | null> {
  if (!check.photo_asset_id || check.requirements_revision === 0) return null;
  const rows = await db()`
    select * from wearcheck.assessments
    where check_id = ${check.id} and requirements_revision = ${check.requirements_revision}
      and photo_asset_id = ${check.photo_asset_id} and superseded_at is null
    order by created_at desc limit 1`;
  const row = rows[0] as unknown as AssessmentRow | undefined;
  return row?.findings_json.policy_version === ASSESSMENT_POLICY_VERSION ? row : null;
}

export async function trackEvent(checkId: string | null, eventName: string, metadata: Record<string, string | number | boolean> = {}) {
  try {
    await db()`insert into wearcheck.product_events (check_id, event_name, metadata) values (${checkId}, ${eventName}, ${db().json(metadata)})`;
  } catch {
    /* analytics must never break the flow */
  }
}
