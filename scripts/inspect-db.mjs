// Read-only inventory of the shared Supabase database. Runs inside a READ ONLY transaction.
// Prints object names and metadata only — never row contents.
import postgres from "postgres";
import { writeFileSync, mkdirSync } from "node:fs";
import { loadEnv } from "./env.mjs";

loadEnv();
const sql = postgres(process.env.SUPABASE_DB_URL, { prepare: false, max: 1 });
const out = {};
try {
  await sql.begin("read only", async (tx) => {
    out.version = (await tx`select version()`)[0].version;
    out.schemas = (await tx`select nspname from pg_namespace where nspname not like 'pg_%' and nspname <> 'information_schema' order by 1`).map((r) => r.nspname);
    out.tables = await tx`select table_schema, table_name from information_schema.tables where table_schema in ('public', 'wearcheck') order by 1, 2`;
    out.rls = await tx`select n.nspname as schema, c.relname as table, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname in ('public', 'wearcheck') order by 1, 2`;
    out.policies = await tx`select schemaname, tablename, policyname, roles, cmd from pg_policies where schemaname in ('public', 'storage', 'wearcheck') order by 1, 2, 3`;
    out.triggers = await tx`select event_object_schema as schema, event_object_table as table, trigger_name from information_schema.triggers where event_object_schema in ('public', 'wearcheck') order by 1, 2, 3`;
    out.functions = await tx`select n.nspname as schema, p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'wearcheck') order by 1, 2`;
    out.schemaGrants = await tx`select nspname as schema, coalesce(nspacl::text, '') as acl from pg_namespace where nspname in ('public', 'wearcheck')`;
    out.extensions = await tx`select extname, extversion from pg_extension order by 1`;
    out.storageBuckets = await tx`select id, public, file_size_limit from storage.buckets order by 1`;
    out.dbSize = (await tx`select pg_size_pretty(pg_database_size(current_database())) as size`)[0].size;
    out.currentRole = (await tx`select current_user`)[0].current_user;
  });
  mkdirSync("private-ops", { recursive: true });
  writeFileSync(`private-ops/db-inventory-${process.argv[2] ?? "snapshot"}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
} finally {
  await sql.end();
}
