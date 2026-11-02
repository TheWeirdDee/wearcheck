import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadEnv } from "../../scripts/env.mjs";
const RUN = process.env.INTEGRATION === "1";
if (RUN) loadEnv();

describe.skipIf(!RUN)("session creation quotas and recovery (controlled database fixtures)", () => {
  let sql: ReturnType<typeof import("@/lib/db").db>;
  const sessions: string[] = [];
  let admitCheck: typeof import("@/lib/checks").admitCheck;
  let hash: typeof import("@/lib/session").hashForRateLimit;
  beforeAll(async () => {
    sql = (await import("@/lib/db")).db();
    admitCheck = (await import("@/lib/checks")).admitCheck;
    hash = (await import("@/lib/session")).hashForRateLimit;
  });
  async function session() {
    const [s] = await sql`insert into wearcheck.guest_sessions (token_hash, expires_at) values (${randomBytes(24).toString("hex")}, now() + interval '1 hour') returning id`;
    sessions.push(s.id as string);
    return s.id as string;
  }
  afterAll(async () => {
    if (!sql) return;
    for (const id of sessions) {
      await sql`delete from wearcheck.rate_events where key_hash = ${hash(id)}`;
      await sql`delete from wearcheck.checks where guest_session_id = ${id} and demo_case = 'fixture-test'`;
      await sql`delete from wearcheck.guest_sessions where id = ${id}`;
    }
    await sql.end();
  });
  it("simultaneous duplicate creation produces one check and consumes one allowance", async () => {
    const id = await session(), request = randomUUID();
    const results = await Promise.all([admitCheck(id, "fixture-test", request), admitCheck(id, "fixture-test", request)]);
    expect(results[0].check.id).toBe(results[1].check.id);
    expect(results.filter((r) => !r.replay)).toHaveLength(1);
    const [{ n }] = await sql`select count(*)::int as n from wearcheck.rate_events where bucket = 'createCheck' and key_hash = ${hash(id)}`;
    expect(n).toBe(1);
  }, 60_000);
  it("quota refusal has a real reset; replay and another session still work; expiry recovers", async () => {
    const id = await session(), other = await session(), request = randomUUID();
    const first = await admitCheck(id, "fixture-test", request);
    await sql`insert into wearcheck.rate_events (bucket, key_hash) select 'createCheck', ${hash(id)} from generate_series(1,19)`;
    await expect(admitCheck(id, "fixture-test", randomUUID())).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429, action: "WAIT", retryAfter: expect.any(Number) });
    expect((await admitCheck(id, "fixture-test", request)).check.id).toBe(first.check.id);
    expect((await admitCheck(other, "fixture-test", randomUUID())).replay).toBe(false);
    // Advance only this fixture's events. No production quota records are changed.
    await sql`update wearcheck.rate_events set created_at = now() - interval '61 minutes' where bucket = 'createCheck' and key_hash = ${hash(id)}`;
    expect((await admitCheck(id, "fixture-test", randomUUID())).replay).toBe(false);
  }, 60_000);
  it("an old model rule check and user answer cannot be reused for an edited requirement", async () => {
    const guest = await session();
    const { check } = await admitCheck(guest, "fixture-test", randomUUID());
    const asset = randomUUID();
    await sql`insert into wearcheck.media_assets (id, check_id, kind, storage_key, mime, width, height, bytes, sha256, origin, expires_at)
      values (${asset}, ${check.id}, 'outfit', ${`checks/${check.id}/fixture.jpg`}, 'image/jpeg', 960,1280,1,'fixture','fixture',now() + interval '1 hour')`;
    await sql`insert into wearcheck.outfit_observations (check_id, photo_asset_id, json, user_corrections, model_id, requirements_revision)
      values (${check.id}, ${asset}, ${sql.json({ rule_checks: [{ rule_id: "r0", assessment: "appears_consistent" }] })}, ${sql.json({ rule_answers: { r0: "does_not_apply" } })}, 'fixture', 1)`;
    const { latestObservation } = await import("@/lib/checks");
    expect((await latestObservation(check.id, asset, 1))?.user_corrections.rule_answers?.r0).toBe("does_not_apply");
    expect(await latestObservation(check.id, asset, 2)).toBeNull();
  }, 60_000);
});
