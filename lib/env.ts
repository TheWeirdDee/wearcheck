import "server-only";
import { z } from "zod";

const schema = z.object({
  YOUCAM_API_KEY: z.string().min(10),
  YOUCAM_API_BASE: z.url().default("https://yce-api-01.makeupar.com"),
  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL: z.string().min(3).default("gemini-2.5-flash"),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_DB_URL: z.string().startsWith("postgres"),
  SUPABASE_STORAGE_BUCKET: z.string().default("wearcheck-private"),
  SESSION_SECRET: z.string().min(32),
  APP_ORIGIN: z.url(),
  CRON_SECRET: z.string().min(16),
  RENDER_LIMIT_PER_SESSION: z.coerce.number().int().min(0).default(4),
  RENDER_LIMIT_GLOBAL_PER_DAY: z.coerce.number().int().min(0).default(60),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Validated server-only configuration. Throws a message naming missing keys, never their values. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`WearCheck configuration incomplete: ${keys}`);
  }
  cached = parsed.data;
  return cached;
}

/** Comma-separated origins accepted for state-changing requests (production origin plus Vercel URLs). */
export function allowedOrigins(): string[] {
  const list = [env().APP_ORIGIN];
  if (process.env.VERCEL_URL) list.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_BRANCH_URL) list.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) list.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return list.map((o) => o.replace(/\/$/, ""));
}
