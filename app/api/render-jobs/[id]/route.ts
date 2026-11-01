import { handler, json } from "@/lib/api";
import { currentAssessment, isUuid, requireOwnedCheck } from "@/lib/checks";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import { advanceJob, publicJob, type JobRow } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Owner-authorised job status. Each poll may advance the provider task (throttled server-side). */
export const GET = handler("render_status", async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const id = (await ctx.params).id;
  if (!isUuid(id)) throw Errors.notFound();
  const [row] = await db()`select check_id from wearcheck.render_jobs where id = ${id}`;
  if (!row) throw Errors.notFound();
  const check = await requireOwnedCheck(row.check_id as string); // ownership via the guest cookie
  const job: JobRow = await advanceJob(id);
  const assessment = await currentAssessment(check);
  return json({ job: publicJob(job, assessment?.id ?? null) });
});
