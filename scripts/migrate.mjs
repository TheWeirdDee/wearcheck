// Additive, versioned migrations for the `wearcheck` schema only.
//   node scripts/migrate.mjs --plan    print pending SQL and the scope check, apply nothing
//   node scripts/migrate.mjs --apply   apply pending migrations, each in its own transaction
// Refuses any migration that drops/truncates objects or references a schema other than wearcheck.
import { readFileSync, readdirSync } from "node:fs";
import postgres from "postgres";
import { loadEnv } from "./env.mjs";

loadEnv();
const mode = process.argv[2];
if (mode !== "--plan" && mode !== "--apply") {
  console.error("usage: migrate.mjs --plan | --apply");
  process.exit(2);
}

const FORBIDDEN = [
  /\bdrop\s+(table|schema|function|trigger|policy|bucket|index|type|view|role|extension)\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\balter\s+(role|database|system|default\s+privileges)\b/i,
  /\b(public|auth|storage|graphql|graphql_public|realtime|extensions|supabase_functions|vault)\.\w/i,
  /\bcreate\s+extension\b/i,
];

function scopeViolations(sql) {
  const body = sql.replace(/--.*$/gm, "");
  return FORBIDDEN.filter((re) => re.test(body)).map((re) => re.source);
}

const dir = new URL("../db/migrations/", import.meta.url);
const files = readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();

const sql = postgres(process.env.SUPABASE_DB_URL, { prepare: false, max: 1, onnotice: () => {} });
try {
  const [{ exists }] = await sql`select exists (select 1 from information_schema.tables where table_schema = 'wearcheck' and table_name = 'schema_migrations') as exists`;
  const applied = new Set(exists ? (await sql`select version from wearcheck.schema_migrations`).map((r) => r.version) : []);
  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) console.log("No pending migrations.");
  for (const f of pending) {
    const text = readFileSync(new URL(f, dir), "utf8");
    const violations = scopeViolations(text);
    console.log(`\n=== ${f} ===`);
    if (violations.length) {
      console.error(`REFUSED: out-of-scope or destructive statements matched: ${violations.join(", ")}`);
      process.exitCode = 1;
      break;
    }
    if (mode === "--plan") {
      console.log(text);
      console.log(`--- scope check passed for ${f} (would apply) ---`);
      continue;
    }
    await sql.begin(async (tx) => {
      await tx.unsafe(text);
      await tx`insert into wearcheck.schema_migrations (version) values (${f}) on conflict do nothing`;
    });
    console.log(`applied ${f}`);
  }
} finally {
  await sql.end();
}
