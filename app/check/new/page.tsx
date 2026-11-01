import type { Metadata } from "next";
import { StartCheckButton } from "@/components/start-check-button";

export const metadata: Metadata = { title: "New check" };

/** Direct entry point. Creating a check is a POST (no state change on GET). */
export default function NewCheckPage() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <p className="eyebrow">New check</p>
      <h1 className="mt-3 text-4xl font-bold">Start an outfit check</h1>
      <p className="mt-4 text-lg text-ink-2">You&rsquo;ll add the event details, confirm them, then add one photo of your outfit. You can finish without signing up; your check is kept privately for 24 hours.</p>
      <div className="mt-8"><StartCheckButton className="btn btn-primary w-full sm:w-auto">Start my check</StartCheckButton></div>
    </main>
  );
}
