/**
 * Controlled-fixture tests for paid-render safety, against the real `wearcheck` schema with the YouCam
 * client and object storage replaced by fakes — so nothing is sent to YouCam and no credit is spent.
 * Every row created here belongs to a labelled fixture check (demo_case 'fixture-test') and is deleted after.
 * Opt-in:  INTEGRATION=1 npx vitest run tests/integration
 */
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadEnv } from "../../scripts/env.mjs";

const RUN = process.env.INTEGRATION === "1";
if (RUN) loadEnv();

const provider = vi.hoisted(() => ({ createTask: vi.fn(), uploadFile: vi.fn(async () => "file-fixture") }));
vi.mock("@/lib/youcam/client", async (orig) => {
  const real = await orig<typeof import("@/lib/youcam/client")>();
  return { ...real, createTask: provider.createTask, uploadFile: provider.uploadFile, getTask: vi.fn(), downloadResult: vi.fn() };
});
vi.mock("@/lib/storage", () => ({
  getObject: vi.fn(async () => Buffer.from("fixture")), putObject: vi.fn(async () => {}), removeObjects: vi.fn(async () => {}),
  listCheckObjects: vi.fn(async () => []), listPrefix: vi.fn(async () => []), ensureBucket: vi.fn(async () => {}),
}));

describe.skipIf(!RUN)("render admission and submission (fixtures, no provider calls)", () => {
  let sql: ReturnType<typeof import("@/lib/db").db>;
  let jobs: typeof import("@/lib/jobs");
  let fixture: { checkId: string; sessionId: string; assessment: import("@/lib/checks").AssessmentRow; check: import("@/lib/checks").CheckRow; findingId: string };

  beforeAll(async () => {
    const { db } = await import("@/lib/db");
    jobs = await import("@/lib/jobs");
    const { fromManual } = await import("@/lib/requirements");
    const { assess } = await import("@/lib/rules");
    sql = db();
    const req = fromManual({ event_name: "Fixture", event_type: "wedding", dress_code: "", setting: "indoor", restrictions: "Flats or wedges recommended", event_date: "" });
    const obsJson = {
      person_count: "one", face_visible: true, full_body_visible: true, feet_visible: "yes", facing: "front", image_quality: "good", lighting: "good",
      items: [{ category: "suit", description: "suit", colour_family: "navy", colour_certainty: "clear", visibility: "clear", footwear_style: null },
        { category: "shoes", description: "boots", colour_family: "black", colour_certainty: "clear", visibility: "clear", footwear_style: "boot" }],
      formality_impression: "formal", rule_checks: [], unobservable: [],
    } as const;
    const result = assess(req, obsJson as never, {}, { shoes: true, full_body: true, upper_body: true, outer: true });
    const [s] = await sql`insert into wearcheck.guest_sessions (token_hash, expires_at) values (${randomBytes(16).toString("hex")}, now() + interval '1 hour') returning id`;
    const [c] = await sql`insert into wearcheck.checks (guest_session_id, demo_case, expires_at, requirements_revision) values (${s.id}, 'fixture-test', now() + interval '1 hour', 1) returning *`;
    await sql`insert into wearcheck.event_requirements (check_id, revision, json) values (${c.id}, 1, ${sql.json(req as never)})`;
    const assetId = randomUUID();
    await sql`insert into wearcheck.media_assets (id, check_id, kind, storage_key, mime, width, height, bytes, sha256, origin, expires_at)
              values (${assetId}, ${c.id}, 'outfit', ${`checks/${c.id}/outfit/${assetId}.jpg`}, 'image/jpeg', 960, 1280, 7, 'fixture', 'fixture', now() + interval '1 hour')`;
    await sql`update wearcheck.checks set photo_asset_id = ${assetId} where id = ${c.id}`;
    const [o] = await sql`insert into wearcheck.outfit_observations (check_id, photo_asset_id, json, model_id) values (${c.id}, ${assetId}, ${sql.json(obsJson as never)}, 'fixture') returning id`;
    const [a] = await sql`insert into wearcheck.assessments (check_id, requirements_revision, photo_asset_id, observation_id, corrections_hash, status, findings_json)
                          values (${c.id}, 1, ${assetId}, ${o.id}, 'fixture', ${result.status}, ${sql.json(result as never)}) returning *`;
    const [check] = await sql`select * from wearcheck.checks where id = ${c.id}`;
    fixture = { checkId: c.id, sessionId: s.id, assessment: a as never, check: check as never, findingId: result.findings.find((f) => f.render_category === "shoes")!.id };
  }, 60_000);

  afterAll(async () => {
    if (!fixture) return;
    await sql`delete from wearcheck.api_usage_events where check_id = ${fixture.checkId} or render_job_id in (select id from wearcheck.render_jobs where check_id = ${fixture.checkId})`;
    await sql`delete from wearcheck.checks where id = ${fixture.checkId} and demo_case = 'fixture-test'`;
    await sql`delete from wearcheck.guest_sessions where id = ${fixture.sessionId}`;
    await sql.end();
  });

  const request = (itemId: string, explicitRetry = false) =>
    jobs.requestRender({ check: fixture.check, assessment: fixture.assessment, findingId: fixture.findingId, reference: { kind: "catalogue", itemId }, explicitRetry });
  const clearJobs = async () => {
    await sql`delete from wearcheck.api_usage_events where render_job_id in (select id from wearcheck.render_jobs where check_id = ${fixture.checkId})`;
    await sql`delete from wearcheck.render_jobs where check_id = ${fixture.checkId}`;
  };

  it("two different simultaneous requests: exactly one is admitted and one provider task is created", async () => {
    await clearJobs();
    provider.createTask.mockReset().mockImplementation(async () => { await new Promise((r) => setTimeout(r, 400)); return "task-fixture-1"; });
    const results = await Promise.allSettled([request("loafer-black-tassel"), request("oxford-tan-captoe")]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const refused = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect((refused[0].reason as { code: string }).code).toBe("RENDER_IN_PROGRESS");
    expect(provider.createTask).toHaveBeenCalledTimes(1);
    const rows = await sql`select status, provider_task_id from wearcheck.render_jobs where check_id = ${fixture.checkId}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].provider_task_id).toBe("task-fixture-1");
  }, 60_000);

  it("a lost response while creating the task is reported as an unknown outcome, never “nothing generated”", async () => {
    await clearJobs();
    provider.createTask.mockReset().mockRejectedValue(new TypeError("fetch failed"));
    const job = await request("loafer-black-tassel");
    expect(job.status).toBe("failed");
    expect(job.error_code).toBe("SUBMIT_OUTCOME_UNKNOWN");
    expect(job.error_message).toMatch(/can't tell whether it was generated/);
    expect(job.error_message).toMatch(/new paid preview/);
    const [u] = await sql`select status, units_estimated from wearcheck.api_usage_events where render_job_id = ${job.id}`;
    expect(u.status).toBe("unknown");
    expect(Number(u.units_estimated)).toBe(2); // budgeted as possibly charged
  }, 60_000);

  it("a definite provider rejection is a plain failure with nothing charged", async () => {
    await clearJobs();
    const { ProviderError } = await import("@/lib/youcam/client");
    provider.createTask.mockReset().mockRejectedValue(new ProviderError("PROVIDER_REJECTED", "The preview service couldn't accept that request.", 422, false));
    const job = await request("oxford-tan-captoe");
    expect(job.error_code).toBe("PROVIDER_REJECTED");
    const [u] = await sql`select status, units_estimated from wearcheck.api_usage_events where render_job_id = ${job.id}`;
    expect(u.status).toBe("not_submitted");
    expect(Number(u.units_estimated)).toBe(0);
  }, 60_000);

  it("a provider 5xx after task submission is ambiguous and retains the possible charge", async () => {
    await clearJobs();
    const { ProviderError } = await import("@/lib/youcam/client");
    provider.createTask.mockReset().mockRejectedValue(new ProviderError("PROVIDER_DOWN", "Server error", 502, true));
    const job = await request("loafer-black-tassel");
    expect(job.error_code).toBe("SUBMIT_OUTCOME_UNKNOWN");
    const [usage] = await sql`select status, units_estimated from wearcheck.api_usage_events where render_job_id = ${job.id}`;
    expect(usage.status).toBe("unknown");
    expect(Number(usage.units_estimated)).toBe(2);
    const duplicate = await request("loafer-black-tassel");
    expect(duplicate.id).toBe(job.id);
    expect(provider.createTask).toHaveBeenCalledTimes(1);
  }, 60_000);

  it("a legacy assessment without provider input checks cannot start a render", async () => {
    await clearJobs();
    provider.createTask.mockReset();
    const assessment = { ...fixture.assessment, findings_json: { ...fixture.assessment.findings_json, photo_supports: undefined } };
    await expect(jobs.requestRender({ check: fixture.check, assessment, findingId: fixture.findingId, reference: { kind: "catalogue", itemId: "loafer-black-tassel" }, explicitRetry: false })).rejects.toMatchObject({ code: "PHOTO_UNSUPPORTED" });
    expect(provider.createTask).not.toHaveBeenCalled();
  }, 60_000);

  it("a crash after the create-task marker is reconciled as unknown, not resubmitted", async () => {
    await clearJobs();
    provider.createTask.mockReset();
    const [row] = await sql`
      insert into wearcheck.render_jobs (check_id, assessment_id, finding_id, feature, catalogue_item_id, source_asset_id, input_revision, idempotency_key, attempt, status, provider_status, lease_until)
      values (${fixture.checkId}, ${fixture.assessment.id}, ${fixture.findingId}, 'shoes-transfer', 'loafer-black-tassel', ${fixture.check.photo_asset_id}, 'fixture-crash', ${randomUUID()}, 1, 'uploading_reference', 'creating_task', now() - interval '1 minute')
      returning id`;
    const job = await jobs.advanceJob(row.id as string);
    expect(job.error_code).toBe("SUBMIT_OUTCOME_UNKNOWN");
    expect(provider.createTask).not.toHaveBeenCalled();
  }, 60_000);

  it("a reference that breaks the confirmed requirement is refused on the server", async () => {
    await clearJobs();
    provider.createTask.mockReset().mockResolvedValue("task-fixture-2");
    await expect(request("pump-nude-pointed")).rejects.toMatchObject({ code: "ITEM_NOT_ELIGIBLE" });
    expect(provider.createTask).not.toHaveBeenCalled();
  }, 60_000);

  it("parallel rate-limited requests can't exceed the limit", async () => {
    const { limit, LIMITS } = await import("@/lib/rate-limit");
    const key = `fixture-${randomUUID()}`;
    const results = await Promise.allSettled(Array.from({ length: LIMITS.renderSubmit.max + 4 }, () => limit("renderSubmit", key, "fixture")));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(LIMITS.renderSubmit.max);
    const { hashForRateLimit } = await import("@/lib/session");
    await sql`delete from wearcheck.rate_events where bucket = 'renderSubmit' and key_hash = ${hashForRateLimit(key)}`;
  }, 60_000);
});
