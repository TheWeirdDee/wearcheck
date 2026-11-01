import Link from "next/link";
import { CheckMenu } from "@/components/workflow/check-menu";
import { WorkflowProgress } from "@/components/workflow/progress";
import { StartCheckButton } from "@/components/start-check-button";
import { currentRequirements, requireOwnedCheck } from "@/lib/checks";
import { AppError } from "@/lib/errors";
import { GUEST_RETENTION_HOURS } from "@/lib/session";

export const dynamic = "force-dynamic";

function Unavailable() {
  return (
    <main id="main" className="wrap max-w-3xl py-16 lg:py-24">
      <p className="eyebrow">Check unavailable</p>
      <h1 className="t-2 mt-4">We can&rsquo;t open this check</h1>
      <p className="mt-4 text-ink-2">
        It may have been deleted, it may belong to another browser, or it expired — guest checks are kept for {GUEST_RETENTION_HOURS} hours. Nothing from it can be viewed.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <StartCheckButton className="btn btn-primary">Start a new check</StartCheckButton>
        <Link href="/privacy" className="btn btn-quiet">How retention works</Link>
      </div>
    </main>
  );
}

/** Every /check/[id] page is authorised server-side against the guest cookie, not the URL. */
export default async function CheckIdLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  let check;
  try {
    check = await requireOwnedCheck(id);
  } catch (e) {
    if (e instanceof AppError) return <Unavailable />;
    throw e;
  }
  const reqs = await currentRequirements(check);
  const r = reqs?.json;
  return (
    <>
      <WorkflowProgress />
      <main id="main" className="wrap pb-32 pt-6 lg:pt-10 xl:grid xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-12">
        <aside className="mb-6 hidden xl:block" aria-label="Event context">
          <div className="sticky top-28 space-y-6 text-[0.95rem]">
            <div className="bg-raised p-5">
              <p className="eyebrow plain">Your occasion</p>
              {r ? (
                <>
                  <p className="mt-3 font-display text-xl font-semibold leading-snug tracking-[-0.02em]">{r.event_name ?? (r.event_type ? `${r.event_type[0].toUpperCase()}${r.event_type.slice(1)}` : "Your occasion")}</p>
                  {r.dress_code ? <p className="mt-1 text-ink-2">{r.dress_code.value}</p> : <p className="mt-1 text-muted">No dress code stated</p>}
                  {r.venue.setting !== "unknown" ? <p className="mt-1 capitalize text-ink-2">{r.venue.setting}{r.venue.surface !== "unknown" ? ` · ${r.venue.surface.replace("_", " ")}` : ""}</p> : null}
                  <p className="mt-4 border-t border-line pt-3 text-muted">{r.rules.length} confirmed requirement{r.rules.length === 1 ? "" : "s"} · revision {reqs!.revision}</p>
                  {r.origin === "demo_manual" ? <p className="mt-2 chip">Entered for this example</p> : null}
                </>
              ) : (
                <p className="mt-2 text-muted">Not confirmed yet</p>
              )}
            </div>
            <div className="px-1 text-muted">
              Kept privately until {new Date(check.expires_at).toUTCString().slice(5, 22)} UTC.
            </div>
            <CheckMenu checkId={check.id} />
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-4 xl:hidden"><CheckMenu checkId={check.id} compact /></div>
          {children}
        </div>
      </main>
    </>
  );
}
