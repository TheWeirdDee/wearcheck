import { z } from "zod";
import { assertSameOrigin, handler, json, readJson } from "@/lib/api";
import { currentAssessment, requireOwnedCheck, trackEvent } from "@/lib/checks";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

const Body = z.object({ decision: z.enum(["keep", "change"]), jobId: z.uuid().optional() });

/** Records the user's decision: keep the outfit, or use a completed preview from the *current* assessment. */
export const POST = handler("decision", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const check = await requireOwnedCheck((await ctx.params).id);
  const { decision, jobId } = Body.parse(await readJson(req));
  const assessment = await currentAssessment(check);
  if (!assessment) throw new AppError("STALE_ASSESSMENT", "Please review the latest assessment first.", 409, true, "EDIT_REQUIREMENTS");
  if (assessment.findings_json.clarification && decision === "change") {
    throw new AppError("NEEDS_ANSWER", "Please answer the open question first.", 409, true, "NONE");
  }
  let job: string | null = null;
  if (decision === "change") {
    if (!jobId) throw new AppError("NO_PREVIEW", "Choose a completed preview to use.", 400, true, "NONE");
    const [j] = await db()`select id from wearcheck.render_jobs where id = ${jobId} and check_id = ${check.id} and assessment_id = ${assessment.id} and status = 'completed'`;
    if (!j) throw new AppError("STALE_PREVIEW", "That preview belongs to an older version of this check.", 409, true, "NONE");
    job = j.id as string;
  }
  await db()`update wearcheck.checks set decision = ${decision}, decision_render_job_id = ${job}, status = 'decided', current_step = 'decision', updated_at = now() where id = ${check.id}`;
  await db()`insert into wearcheck.decision_cards (check_id, assessment_id, render_job_id, disclaimer_version) values (${check.id}, ${assessment.id}, ${job}, 'card-v1')`;
  await trackEvent(check.id, decision === "keep" ? "keep_outfit_selected" : "correction_selected", {});
  return json({ ok: true, nextPath: `/check/${check.id}/decision` });
});
