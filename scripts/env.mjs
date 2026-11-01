// Minimal .env.local loader for operational scripts. Never prints values.
import { readFileSync } from "node:fs";
export function loadEnv(path = ".env.local") {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
  }
}
