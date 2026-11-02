import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadEnv } from "../../scripts/env.mjs";
const RUN = process.env.INTEGRATION === "1";
if (RUN) loadEnv();
const storage = vi.hoisted(() => ({ putObject: vi.fn(async () => {}), removeObjects: vi.fn<(keys: string[]) => Promise<void>>(async () => {}), listCheckObjects: vi.fn<(id: string) => Promise<string[]>>(async () => []) }));
vi.mock("@/lib/storage", () => storage);

describe.skipIf(!RUN)("storage failure compensation (database fixtures, mocked storage)", () => {
  let sql: ReturnType<typeof import("@/lib/db").db>;
  let session: string;
  const checks: string[] = [];
  beforeAll(async () => {
    sql = (await import("@/lib/db")).db();
    const [s] = await sql`insert into wearcheck.guest_sessions (token_hash, expires_at) values (${randomBytes(24).toString("hex")},now() + interval '1 hour') returning id`;
    session = s.id as string;
  });
  async function check() {
    const [c] = await sql`insert into wearcheck.checks (guest_session_id,demo_case,expires_at) values (${session},'fixture-test',now() + interval '1 hour') returning id`;
    checks.push(c.id as string); return c.id as string;
  }
  afterAll(async () => {
    if (!sql) return;
    for (const id of checks) await sql`delete from wearcheck.checks where id = ${id} and demo_case = 'fixture-test'`;
    await sql`delete from wearcheck.guest_sessions where id = ${session}`;
    await sql.end();
  });
  it("object deletion failure revokes access first and retains rows for cleanup retry", async () => {
    const id = await check(), asset = randomUUID(), key = `checks/${id}/outfit/${asset}.jpg`;
    await sql`insert into wearcheck.media_assets (id,check_id,kind,storage_key,mime,width,height,bytes,sha256,origin,expires_at)
      values (${asset},${id},'outfit',${key},'image/jpeg',960,1280,1,'fixture','fixture',now() + interval '1 hour')`;
    storage.removeObjects.mockRejectedValueOnce(new Error("fixture storage unavailable"));
    const { deleteCheck } = await import("@/lib/privacy");
    await expect(deleteCheck(id)).rejects.toThrow("fixture storage unavailable");
    expect((await sql`select status from wearcheck.checks where id = ${id}`)[0].status).toBe("deleted");
    expect(await sql`select id from wearcheck.media_assets where id = ${asset}`).toHaveLength(1);
    storage.listCheckObjects.mockResolvedValueOnce([key, `checks/${id}/render_result/orphan.jpg`]);
    await expect(deleteCheck(id)).resolves.toMatchObject({ deletedAssets: 2 });
    expect(await sql`select id from wearcheck.media_assets where id = ${asset}`).toHaveLength(0);
  }, 60_000);
  it("a save racing deletion removes the uploaded object when no asset row can be inserted", async () => {
    const id = await check();
    await sql`update wearcheck.checks set status = 'deleted' where id = ${id}`;
    const { saveAsset } = await import("@/lib/checks");
    storage.removeObjects.mockClear();
    await expect(saveAsset(id, "outfit", { bytes: Buffer.from("fixture"), width: 960, height: 1280, sha256: "fixture", mime: "image/jpeg" }, "fixture")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(storage.putObject).toHaveBeenCalled();
    expect(storage.removeObjects.mock.calls[0][0][0]).toMatch(new RegExp(`^checks/${id}/outfit/`));
    expect(await sql`select id from wearcheck.media_assets where check_id = ${id}`).toHaveLength(0);
  }, 60_000);
});
