import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap max-w-3xl py-20 lg:py-28">
        <p className="eyebrow">Page not found</p>
        <h1 className="t-1 mt-5">This page doesn&rsquo;t exist.</h1>
        <p className="lede mt-5">If you were looking for a check, it may have been deleted or expired — checks are kept for 24 hours.</p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-primary">Go to WearCheck</Link>
          <Link href="/help" className="btn btn-secondary">Help</Link>
        </div>
      </main>
    </>
  );
}
