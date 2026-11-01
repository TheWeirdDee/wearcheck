// Read-only structural fingerprint of everything in the shared Supabase project that is NOT WearCheck:
// table/column/constraint/index definitions, RLS flags, policies, grants, functions, triggers,
// schema ACLs, API role settings and storage bucket configuration. Never reads application rows.
//   node scripts/db-fingerprint.mjs <label>        → private-ops/db-fingerprint-<label>.json
//   node scripts/db-fingerprint.mjs --compare a b  → prints which sections differ
import postgres from "postgres";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { loadEnv } from "./env.mjs";

if (process.argv[2] === "--compare") {
  const [a, b] = process.argv.slice(3).map((l) => JSON.parse(readFileSync(`private-ops/db-fingerprint-${l}.json`, "utf8")));
  let same = true;
  for (const k of Object.keys(a.hashes)) {
    const eq = a.hashes[k] === b.hashes[k];
    if (!eq) same = false;
    console.log(`${eq ? "same   " : "CHANGED"} ${k}`);
  }
  console.log(same ? "\nNon-WearCheck structure is identical." : "\nDifferences found — inspect before continuing.");
  process.exit(same ? 0 : 1);
}

loadEnv();
const label = process.argv[2] ?? "snapshot";
const sql = postgres(process.env.SUPABASE_DB_URL, { prepare: false, max: 1 });
const S = ["public", "drizzle", "storage", "auth", "graphql_public", "realtime", "vault", "extensions"];
const sections = {};
try {
  await sql.begin("read only", async (tx) => {
    sections.schemas = await tx`select nspname, coalesce(nspacl::text,'') acl from pg_namespace where nspname not like 'pg_%' and nspname <> 'information_schema' and nspname <> 'wearcheck' order by 1`;
    sections.columns = await tx`select table_schema, table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema in ('public','drizzle') order by 1,2,ordinal_position`;
    sections.constraints = await tx`select n.nspname, c.relname, con.conname, pg_get_constraintdef(con.oid) def from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','drizzle') order by 1,2,3`;
    sections.indexes = await tx`select schemaname, tablename, indexname, indexdef from pg_indexes where schemaname in ('public','drizzle') order by 1,2,3`;
    sections.rls = await tx`select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname in ('public','drizzle','storage') order by 1,2`;
    sections.policies = await tx`select schemaname, tablename, policyname, permissive, roles::text, cmd, coalesce(qual,'') qual, coalesce(with_check,'') with_check from pg_policies where schemaname <> 'wearcheck' order by 1,2,3`;
    sections.tableGrants = await tx`select table_schema, table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema in ('public','drizzle','storage') order by 1,2,3,4`;
    sections.defaultAcl = await tx`select coalesce(n.nspname,'') nsp, d.defaclobjtype, d.defaclacl::text acl from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace order by 1,2,3`;
    sections.functions = await tx`select n.nspname, p.proname, md5(pg_get_functiondef(p.oid)) def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','drizzle','storage') and p.prokind in ('f','p') order by 1,2,3`;
    sections.triggers = await tx`select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation, action_statement from information_schema.triggers where event_object_schema in ('public','drizzle','storage') order by 1,2,3,5`;
    sections.roles = await tx`select rolname, coalesce(rolconfig::text,'') cfg, rolcanlogin, rolsuper from pg_roles where rolname in ('anon','authenticated','service_role','authenticator','postgres') order by 1`;
    sections.extensions = await tx`select extname, extversion from pg_extension order by 1`;
    sections.buckets = await tx`select id, name, public, file_size_limit, coalesce(allowed_mime_types::text,'') mimes, owner::text, created_at::text, updated_at::text from storage.buckets where id <> 'wearcheck-private' order by 1`;
  });
} finally {
  await sql.end();
}
const hashes = Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, createHash("sha256").update(JSON.stringify(v)).digest("hex")]));
mkdirSync("private-ops", { recursive: true });
writeFileSync(`private-ops/db-fingerprint-${label}.json`, JSON.stringify({ at: new Date().toISOString(), schemasCovered: S, hashes, sections }, null, 2));
console.log(`fingerprint ${label}:`, Object.entries(sections).map(([k, v]) => `${k}=${v.length}`).join(" "));
