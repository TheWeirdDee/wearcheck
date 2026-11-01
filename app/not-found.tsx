import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-4xl font-bold">This page doesn&rsquo;t exist</h1>
        <p className="mt-4 text-ink-2">If you were looking for a check, it may have been deleted or expired.</p>
        <Link href="/" className="btn btn-primary mt-8">Go to WearCheck</Link>
      </main>
    </>
  );
}
