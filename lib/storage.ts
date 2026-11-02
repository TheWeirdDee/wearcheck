import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Private object storage in a dedicated Supabase bucket (`wearcheck-private`).
 * Only this bucket is ever addressed. Objects are served through owner-checked routes, never public URLs.
 */
let client: SupabaseClient | null = null;
let bucketReady = false;

function sb() {
  if (!client) {
    client = createClient(env().SUPABASE_URL, env().SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(init?.signal ? [init.signal] : [])]) }) },
    });
  }
  return client;
}

const bucket = () => env().SUPABASE_STORAGE_BUCKET;

export async function ensureBucket() {
  if (bucketReady) return;
  const { data } = await sb().storage.getBucket(bucket());
  if (!data) {
    const { error } = await sb().storage.createBucket(bucket(), {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png"],
    });
    if (error && !/already exists/i.test(error.message)) throw new Error(`storage bucket: ${error.message}`);
  } else if (data.public) {
    throw new Error("WearCheck storage bucket is public; refusing to store private images.");
  }
  bucketReady = true;
}

export async function putObject(key: string, bytes: Buffer, contentType: "image/jpeg" | "image/png") {
  await ensureBucket();
  const { error } = await sb().storage.from(bucket()).upload(key, bytes, { contentType, upsert: false, cacheControl: "0" });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
}

export async function getObject(key: string): Promise<Buffer> {
  const { data, error } = await sb().storage.from(bucket()).download(key);
  if (error || !data) throw new Error(`storage download failed: ${error?.message ?? "empty"}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function removeObjects(keys: string[]) {
  if (keys.length === 0) return;
  for (let i = 0; i < keys.length; i += 100) {
    const { error } = await sb().storage.from(bucket()).remove(keys.slice(i, i + 100));
    if (error) throw new Error(`storage delete failed: ${error.message}`);
  }
}

/** Lists object keys directly under a prefix (Storage listing is one level deep; folders have no id). */
export async function listPrefix(prefix: string): Promise<string[]> {
  const { data, error } = await sb().storage.from(bucket()).list(prefix, { limit: 1000 });
  if (error) throw new Error(`storage list failed: ${error.message}`);
  return (data ?? []).filter((o) => o.id).map((o) => `${prefix}/${o.name}`);
}

const ASSET_KINDS = ["invitation", "outfit", "reference_upload", "render_result", "decision_card"] as const;

/** Every object stored for one check (checks/<id>/<kind>/<file>), including any without a database row. */
export async function listCheckObjects(checkId: string): Promise<string[]> {
  if (!/^[0-9a-f-]{36}$/i.test(checkId)) throw new Error("bad check id");
  const lists = await Promise.all(ASSET_KINDS.map((k) => listPrefix(`checks/${checkId}/${k}`)));
  return lists.flat();
}
