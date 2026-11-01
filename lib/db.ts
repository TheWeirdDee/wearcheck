import "server-only";
import postgres from "postgres";
import { env } from "./env";

declare global {
  var __wearcheckSql: ReturnType<typeof postgres> | undefined;
}

/**
 * Server-only Postgres client for the dedicated `wearcheck` schema.
 * Every query names `wearcheck.` explicitly; nothing here touches other schemas.
 * `prepare: false` is required for the Supavisor transaction pooler.
 */
export function db() {
  if (!globalThis.__wearcheckSql) {
    globalThis.__wearcheckSql = postgres(env().SUPABASE_DB_URL, {
      prepare: false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 15,
      onnotice: () => {},
      transform: { undefined: null },
    });
  }
  return globalThis.__wearcheckSql;
}

export type Sql = ReturnType<typeof db>;
