"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { api, ClientApiError } from "@/lib/client";
import type { PublicJob } from "@/lib/jobs";
import { CheckIcon, DownloadIcon } from "../icons";
import { Compare } from "./compare";

const TERMINAL = ["completed", "failed", "expired"];

type Props = {
  checkId: string;
  initialJob: PublicJob;
  originalUrl: string;
  item: { title: string; file: string | null; userUrl: string | null; credit: string | null; reason: string };
};

export function PreviewRunner({ checkId, initialJob, originalUrl, item }: Props) {
  const router = useRouter();
  const [job, setJob] = useState<PublicJob>(initialJob);
  const initiallyDone = initialJob.status === "completed";
  const [waiting, setWaiting] = useState(!TERMINAL.includes(initialJob.status));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const jobId = initialJob.id;
  useEffect(() => {
    if (!waiting) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await api<{ job: PublicJob }>(`/api/render-jobs/${jobId}`);
        if (cancelled) return;
        setOffline(false);
        setJob(r.job);
        if (TERMINAL.includes(r.job.status)) {
          setWaiting(false);
          return;
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ClientApiError && e.status === 404) {
          setWaiting(false);
          setError("This check is no longer available.");
          return;
        }
        setOffline(true); // keep polling; the job lives on the server
      }
      if (!cancelled) timer.current = setTimeout(tick, 5000);
    };
    timer.current = setTimeout(tick, 1500);
    // Returning from background: check immediately instead of waiting for the next tick.
    const onVisible = () => {
      if (document.visibilityState === "visible" && timer.current) {
        clearTimeout(timer.current);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [waiting, jobId]);

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ jobId: string }>("/api/render-jobs", {
        method: "POST",
        body: JSON.stringify({
          checkId,
          findingId: job.findingId ?? `voluntary:${job.category}`,
          ...(job.catalogueItemId ? { itemId: job.catalogueItemId } : { userAssetId: job.userRefAssetId, userCategory: job.category }),
          retry: true,
        }),
      });
      router.replace(`/check/${checkId}/preview?job=${r.jobId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.body.message : "Couldn't start again.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: "keep" | "change") {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ nextPath: string }>(`/api/checks/${checkId}/decision`, { method: "POST", body: JSON.stringify({ decision, ...(decision === "change" ? { jobId: job.id } : {}) }) });
      router.push(r.nextPath);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.body.message : "Couldn't save your decision.");
      setBusy(false);
    }
  }

  const done = job.status === "completed" && job.resultUrl;
  const failed = job.status === "failed" || job.status === "expired";

  return (
    <div>
      <p className="eyebrow plain">Step 4 · {job.feature === "shoes-transfer" ? "Shoe preview" : "Garment preview"} by YouCam</p>
      <h1 className="t-2 mt-3">{done ? "Your AI preview" : failed ? "The preview didn't work" : "Generating your preview"}</h1>
      {job.stale ? <p className="mt-4 border-l-2 border-warn pl-3 text-[0.95rem]">This preview was made for an earlier version of your requirements or photo. It&rsquo;s kept for reference but isn&rsquo;t part of your current assessment.</p> : null}

      {done ? (
        <MotionConfig reducedMotion="user">
        <motion.div
          className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
          initial={initiallyDone ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <Compare originalUrl={originalUrl} previewUrl={job.resultUrl!} previewAlt={`AI-generated preview with ${item.title}`} />
          <div>
            <h2 className="t-3">{item.title}</h2>
            <p className="mt-2 text-ink-2">{item.reason}</p>
            {item.credit ? <p className="photo-credit mt-2">{item.credit}</p> : null}
            <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
              {!job.stale ? <button type="button" className="btn btn-primary" onClick={() => decide("change")} disabled={busy}>Use this look</button> : null}
              <a href={`${job.resultUrl}?download=1`} className="btn btn-secondary"><DownloadIcon /> Download image</a>
              <Link href={`/check/${checkId}/options`} className="btn btn-secondary">Try another item</Link>
              <button type="button" className="btn btn-quiet" onClick={() => decide("keep")} disabled={busy}>Keep original</button>
            </div>
            {job.completedAt && job.submittedAt ? <p className="mt-4 text-[0.875rem] text-muted">Generated in {Math.round((new Date(job.completedAt).getTime() - new Date(job.submittedAt).getTime()) / 1000)}s · saved privately to this check.</p> : null}
          </div>
        </motion.div>
        </MotionConfig>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={originalUrl} alt="Your original outfit photo" className="aspect-[4/5] max-h-[64vh] w-full bg-photo object-contain" />
            <figcaption className="photo-credit mt-3">Your original photo</figcaption>
          </figure>
          <div className="flex flex-col">
            <div className="relative flex min-h-72 flex-1 flex-col justify-between overflow-hidden bg-raised p-5 sm:p-6">
              {!failed && waiting ? <span aria-hidden className="wc-scan absolute inset-0" /> : null}
              <span className="ai-label self-start">AI preview</span>
              <div className="flex items-center gap-3">
                {item.file ? <div className="relative size-20 shrink-0 bg-bg"><Image src={`/reference/${item.file}`} alt="" fill sizes="64px" className="object-contain p-1" /></div> : null}
                <p className="font-display text-lg font-semibold leading-snug">{item.title}</p>
              </div>
              <ol className="relative mt-6 space-y-2.5 text-[0.95rem]" aria-label="Preview progress">
                {job.timeline.map((t) => (
                  <li key={t.key} className={`flex items-center gap-2 ${t.done ? "text-ink" : "text-muted"}`}>
                    <span className={`inline-flex size-6 flex-none items-center justify-center border ${t.done ? "border-ink bg-ink text-bg" : "border-line-strong"}`}>{t.done ? <CheckIcon className="size-3" /> : null}</span>
                    {t.label}
                  </li>
                ))}
              </ol>
            </div>
            <p role="status" aria-live="polite" className="mt-4 text-[0.95rem] text-ink-2">
              {failed ? job.error?.message : !waiting ? "Stopped waiting. The preview keeps running on the provider's side." : job.status === "delayed" ? "This is taking longer than usual. It's still running." : offline ? "Connection lost — we'll reconnect automatically." : "This can take a minute or more. You can leave this page and come back to this check."}
            </p>
          </div>
        </div>
      )}

      {error ? <p role="alert" className="mt-4 border-l-2 border-bad pl-3 font-medium">{error}</p> : null}

      {!done ? (
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {failed ? (
            <>
              {job.error?.code !== "RENDER_LIMIT_SESSION" ? <button type="button" className="btn btn-primary" onClick={retry} disabled={busy}>{busy ? "Starting…" : "Try again"}</button> : null}
              <Link href={`/check/${checkId}/options`} className="btn btn-secondary">Choose another item</Link>
              <Link href={`/check/${checkId}/outfit`} className="btn btn-quiet">Use a different photo</Link>
              <button type="button" className="btn btn-quiet" onClick={() => decide("keep")} disabled={busy}>Keep my outfit</button>
            </>
          ) : waiting ? (
            <button type="button" className="btn btn-quiet" onClick={() => { setWaiting(false); if (timer.current) clearTimeout(timer.current); }}>Cancel waiting</button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setWaiting(true)}>Resume checking</button>
          )}
        </div>
      ) : null}
      {failed ? <p className="mt-4 text-[0.9rem] text-muted">“Try again” starts a new preview, which uses provider credit. We never retry automatically.</p> : null}
      {!done && !failed ? <p className="mt-4 text-[0.9rem] text-muted">“Cancel waiting” only stops this page checking; a task already sent to YouCam can&rsquo;t be cancelled and may still finish.</p> : null}
    </div>
  );
}
