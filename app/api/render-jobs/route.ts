import { after } from "next/server";
import { z } from "zod";
import { assertSameOrigin, handler, json, readJson } from "@/lib/api";
import { currentAssessment, requireOwnedCheck } from "@/lib/checks";
import { AppError } from "@/lib/errors";
import { advanceJob, publicJob, requestRender } from "@/lib/jobs";
import { clientIp, limit } from "@/lib/rate-limit";
import { RenderCategory } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  checkId: z.uuid(),
  findingId: z.string().max(16),
  itemId: z.string().max(64).optional(),
  userAssetId: z.uuid().optional(),
  userCategory: RenderCategory.optional(),
  retry: z.boolean().optional(),
});

/** Creates (or returns the existing) server-owned render job. Duplicate clicks map to the same job. */
export const POST = handler("render_create", async (req: Request) => {
  assertSameOrigin(req);
  const body = Body.parse(await readJson(req));
  const check = await requireOwnedCheck(body.checkId);
  const assessment = await currentAssessment(check);
  if (!assessment) throw new AppError("STALE_ASSESSMENT", "Please review the latest assessment first.", 409, true, "EDIT_REQUIREMENTS");
  if (!body.itemId && !(body.userAssetId && body.userCategory)) throw new AppError("NO_ITEM", "Choose an item to preview.", 400, true, "CHOOSE_ANOTHER_ITEM");
  await limit("renderSubmit", clientIp(req), "preview requests");

  const job = await requestRender({
    check,
    assessment,
    findingId: body.findingId,
    reference: body.itemId ? { kind: "catalogue", itemId: body.itemId } : { kind: "user", assetId: body.userAssetId!, category: body.userCategory! },
    explicitRetry: Boolean(body.retry),
  });

  // Keep advancing the provider task after the response, so results are saved even if the tab closes.
  after(async () => {
    const deadline = Date.now() + 270_000;
    let j = job;
    while (Date.now() < deadline && ["submitted", "processing", "delayed", "persisting_result"].includes(j.status)) {
      await new Promise((r) => setTimeout(r, 9000));
      j = await advanceJob(j.id);
    }
  });
  return json({ jobId: job.id, status: job.status, job: publicJob(job, assessment.id) }, 202);
});
