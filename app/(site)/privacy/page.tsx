import type { Metadata } from "next";
import Link from "next/link";
import { DeleteCurrentCheck } from "@/components/delete-current-check";
import { DocNav } from "@/components/doc-nav";
import { CATALOGUE } from "@/lib/catalogue";
import editorialLicences from "@/public/editorial/LICENSES.json";

export const metadata: Metadata = { title: "Privacy & retention", description: "What WearCheck collects, who processes it, where it's stored, how long it's kept and how to delete it." };

const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "collection", label: "What we collect" },
  { id: "processing", label: "How it's processed" },
  { id: "storage", label: "Storage & access" },
  { id: "retention", label: "Retention" },
  { id: "deletion", label: "Deletion" },
  { id: "third-parties", label: "Third parties" },
  { id: "choices", label: "Your choices" },
  { id: "data-controls", label: "Data controls" },
  { id: "licences", label: "Image credits" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28 border-t border-line pt-10">
      <h2 id={`${id}-h`} className="t-3">{title}</h2>
      <div className="measure mt-5 space-y-4 text-ink-2 [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const editorial = Object.entries(editorialLicences as Record<string, { photographer: string; license: string; licenseUrl: string; page: string; modifications: string }>);
  const credits = Array.from(new Map(editorial.map(([, v]) => [v.page, v])).values());
  return (
    <>
      <header className="wrap pb-10 pt-10 lg:pb-14 lg:pt-16">
        <p className="eyebrow">Privacy</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <h1 className="t-1 max-w-[15ch]">Your photos, plainly explained.</h1>
          <p className="lede">What WearCheck collects for a check, who processes it, how long it&rsquo;s kept, and how to delete it yourself.</p>
        </div>
      </header>

      <div className="wrap grid gap-10 pb-16 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:pb-24">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <DocNav sections={SECTIONS} label="Privacy sections" />
        </aside>

        <div className="min-w-0 space-y-14">
          <section id="summary" aria-labelledby="summary-h" className="scroll-mt-28">
            <h2 id="summary-h" className="sr-only">Summary</h2>
            <ul className="grid gap-px bg-line sm:grid-cols-2">
              {[
                ["No account", "A private browser session holds your check. We don't ask for your name or email."],
                ["Private by default", "Photos are served only to the browser that uploaded them. There are no public image links."],
                ["24-hour checks", "Each check locks 24 hours after it starts. A cleanup that runs daily then deletes it, normally within the next 24 hours."],
                ["Delete any time", "Delete a check from inside it, or everything in this browser from the data controls below."],
              ].map(([t, d]) => (
                <li key={t} className="bg-bg p-5 sm:p-6">
                  <p className="font-display text-lg font-semibold">{t}</p>
                  <p className="mt-1.5 text-[0.975rem] text-ink-2">{d}</p>
                </li>
              ))}
            </ul>
          </section>

          <Section id="collection" title="What we collect">
            <p>For each check: the invitation image if you upload one, the event details you type or confirm, your outfit photo, any item photo you choose to try, the requirements and findings, any preview image, and your decision.</p>
            <p>Images are decoded and re-encoded on upload, which removes location and camera metadata. We set one HTTP-only cookie that identifies your browser session; it holds a random token, not personal details.</p>
          </Section>

          <Section id="processing" title="How it's processed">
            <p><strong>Google Gemini</strong> reads the invitation text and describes the clothing visible in your photo. Its output is treated as observations only; WearCheck&rsquo;s own rules make the assessment.</p>
            <p><strong>YouCam</strong> (Perfect Corp.) receives your outfit photo and the chosen reference item <strong>only when you ask for a preview</strong>, and returns the AI-generated image. We copy it into WearCheck&rsquo;s private storage straight away.</p>
          </Section>

          <Section id="storage" title="Storage & access">
            <p>WearCheck stores data in a <strong>dedicated database schema and a private storage bucket</strong> inside a Supabase project that also hosts a separate application by the same developer. The two apps share the provider account and its infrastructure, not data: WearCheck&rsquo;s schema isn&rsquo;t exposed through Supabase&rsquo;s public APIs, and only WearCheck&rsquo;s server reads it.</p>
            <p>Every request for a check or image is checked against your session cookie; a link on its own isn&rsquo;t enough. Check pages are marked not to be indexed. The app is hosted on <strong>Vercel</strong>.</p>
          </Section>

          <Section id="retention" title="Retention">
            <p>A check expires <strong>24 hours</strong> after it starts. From then it can&rsquo;t be opened, and a cleanup job that runs daily (and opportunistically as people use the app) permanently deletes its files and records — normally within 24 hours of expiry, so at most about 48 hours after you start. The scheduled run is daily at 04:17 UTC; deleting a check yourself removes it immediately. Copies held by Google or YouCam follow their own retention policies.</p>
            <p>We keep a small usage ledger without images or text — the provider, feature, task reference, status and timing of each preview — to manage the free-tier budget and investigate failures. Short-lived, hashed rate-limit entries are removed after two days.</p>
          </Section>

          <Section id="deletion" title="Deletion">
            <p>Deleting a check first blocks access to it, then removes its stored images from WearCheck&rsquo;s bucket and deletes its database records. The usage ledger keeps its counts but loses the link to the check.</p>
            <p>In our tests the bucket listing showed the files gone immediately, while the storage provider could still return a cached copy to WearCheck&rsquo;s own server for about a minute. No page or link can reach those copies, because access is revoked before the files are removed.</p>
            <p><strong>We can&rsquo;t delete copies held by Google or YouCam.</strong> Their own retention terms apply, and we don&rsquo;t claim otherwise. Anything you downloaded yourself, such as the decision card, is yours to delete.</p>
          </Section>

          <Section id="third-parties" title="Third parties">
            <ul className="space-y-3">
              <li><strong>Google Gemini API</strong> — invitation reading and outfit description. WearCheck uses the free tier; Google&rsquo;s terms for unpaid use allow submitted content to be used to improve its services. Don&rsquo;t upload anything you don&rsquo;t want processed that way.</li>
              <li><strong>YouCam / Perfect Corp.</strong> — preview generation, only on request.</li>
              <li><strong>Supabase</strong> — database and private file storage (shared project, dedicated schema and bucket).</li>
              <li><strong>Vercel</strong> — hosting and scheduled cleanup.</li>
            </ul>
            <p>Nothing is published or sold. The decision card is a file you download; whoever you send it to sees the images in it.</p>
          </Section>

          <Section id="choices" title="Your choices">
            <ul className="list-disc space-y-2 pl-5 marker:text-line-strong">
              <li>Type the event details instead of uploading the invitation.</li>
              <li>Finish with “Keep my outfit” — your photo is never sent to YouCam.</li>
              <li>Upload only a photo of yourself, or of an adult who has given you permission. Previews may change how the person looks.</li>
              <li>Delete a check whenever you like.</li>
            </ul>
          </Section>

          <section id="data-controls" aria-labelledby="data-controls-h" className="scroll-mt-28 bg-raised p-6 sm:p-8">
            <p className="eyebrow plain">Data controls</p>
            <h2 id="data-controls-h" className="t-3 mt-3">Delete the checks in this browser</h2>
            <p className="measure mt-3 text-ink-2">
              Deletes every check created in this browser session — photos, invitation, requirements, findings, previews and decisions — from WearCheck&rsquo;s storage, straight away. It doesn&rsquo;t affect other browsers or devices, and it can&rsquo;t reach copies held by Google or YouCam.
            </p>
            <div className="mt-6"><DeleteCurrentCheck /></div>
          </section>

          <Section id="licences" title="Image credits & licences">
            <p>Reference items in the workflow are styling references, not shopping listings. Marketing photographs are editorial images that illustrate the product; they were never assessed or rendered.</p>
            <h3 className="pt-2 font-display text-base font-semibold text-ink">Reference items</h3>
            <ul className="divide-y divide-line border-y border-line text-[0.95rem]">
              {CATALOGUE.filter((c) => c.enabled).map((c) => (
                <li key={c.id} className="py-3">
                  <span className="font-medium text-ink">{c.title}</span>
                  <span className="block text-ink-2">
                    {c.creator} · <a className="link" href={c.licence_url} rel="license noopener noreferrer" target="_blank">{c.licence}</a> · <a className="link" href={c.source_url} rel="noopener noreferrer" target="_blank">source</a> · {c.modifications}
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="pt-4 font-display text-base font-semibold text-ink">Editorial photographs</h3>
            <ul className="divide-y divide-line border-y border-line text-[0.95rem]">
              {credits.map((v) => (
                <li key={v.page} className="py-3">
                  <span className="font-medium text-ink">{v.photographer.replace(/\s+\S+$/, "")}</span>
                  <span className="block text-ink-2">
                    Unsplash, via Wikimedia Commons · <a className="link" href={v.licenseUrl} rel="license noopener noreferrer" target="_blank">{v.license}</a> · <a className="link" href={v.page} rel="noopener noreferrer" target="_blank">source</a> · cropped and colour graded
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[0.95rem]">Typefaces: Inter and Inter Tight, SIL Open Font License 1.1. See the <Link href="/help" className="link">help guide</Link> for the product&rsquo;s limitations.</p>
          </Section>
        </div>
      </div>
    </>
  );
}
