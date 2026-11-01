import type { Metadata } from "next";
import Link from "next/link";
import { CATALOGUE } from "@/lib/catalogue";
import { DeleteCurrentCheck } from "@/components/delete-current-check";

export const metadata: Metadata = { title: "Privacy & retention", description: "What WearCheck uploads, who processes it, how long it's kept and how to delete it." };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 pt-10 sm:px-6 lg:pt-16">
      <p className="eyebrow">Privacy</p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Your photos, plainly explained.</h1>

      <div className="mt-8 border border-ink p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Delete your current check</h2>
        <p className="mt-2 text-ink-2">Removes the stored photos, invitation, previews and results for checks in this browser session right now.</p>
        <div className="mt-4"><DeleteCurrentCheck /></div>
      </div>

      <section className="mt-14 space-y-4 text-lg leading-relaxed text-ink-2">
        <h2 className="text-2xl font-semibold text-ink">What is uploaded</h2>
        <p>The invitation image (if you upload one), the event details you type, your outfit photo, and any item photo you choose to try. Images are re-encoded on upload, which removes location and camera metadata.</p>
        <h2 className="pt-6 text-2xl font-semibold text-ink">Where it&rsquo;s stored</h2>
        <p>In a private storage bucket and database used only by WearCheck. Images are served only to the browser session that created the check; there are no public image links, and pages are marked not to be indexed.</p>
        <h2 id="processors" className="scroll-mt-20 pt-6 text-2xl font-semibold text-ink">Who processes it</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong className="text-ink">Google Gemini API</strong> (free tier) reads the invitation image and describes the clothing in your photo. Google&rsquo;s terms for the free tier may allow it to use submitted content to improve its services; don&rsquo;t upload anything you don&rsquo;t want processed that way.</li>
          <li><strong className="text-ink">YouCam (Perfect Corp.)</strong> receives your photo and the reference item only when you click “Generate preview”, and returns the AI-generated image.</li>
          <li><strong className="text-ink">Supabase</strong> hosts WearCheck&rsquo;s private database and storage. <strong className="text-ink">Vercel</strong> hosts the app.</li>
        </ul>
        <p>WearCheck can&rsquo;t delete copies held by these processors; their own retention policies apply. We don&rsquo;t claim otherwise.</p>
        <h2 className="pt-6 text-2xl font-semibold text-ink">How long it&rsquo;s kept</h2>
        <p>Guest checks expire <strong className="text-ink">24 hours</strong> after you last start a check. From then they can&rsquo;t be opened, and a scheduled cleanup permanently deletes the stored files and records (at the latest within a day after expiry). Deleting a check removes it immediately. Anonymous counts of preview usage (no images, no text) are kept to manage the provider budget.</p>
        <h2 className="pt-6 text-2xl font-semibold text-ink">Sharing</h2>
        <p>Nothing is shared or published by WearCheck. The decision card is a file you download; whoever you send it to sees the images in it.</p>
        <h2 className="pt-6 text-2xl font-semibold text-ink">Consent</h2>
        <p>Only upload a photo of yourself, or of an adult who has given you permission. Previews may change how the person looks.</p>
      </section>

      <section id="licences" className="mt-16 scroll-mt-20">
        <h2 className="text-2xl font-semibold">Reference image licences</h2>
        <p className="mt-2 text-ink-2">Reference items are styling references, not shopping listings. Each image is used under the licence shown.</p>
        <ul className="mt-6 divide-y divide-line border-y border-line text-sm">
          {CATALOGUE.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between sm:gap-6">
              <span className="font-medium">{c.title}</span>
              <span className="text-ink-2">
                {c.creator} · <a className="underline" href={c.licence_url} rel="license noopener noreferrer" target="_blank">{c.licence}</a> ·{" "}
                <a className="underline" href={c.source_url} rel="noopener noreferrer" target="_blank">source</a> · {c.modifications}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">Typefaces: Inter and Inter Tight, SIL Open Font License 1.1. See the <Link href="/help" className="underline">help page</Link> for limitations.</p>
      </section>
    </div>
  );
}
