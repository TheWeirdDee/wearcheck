# WearCheck — submission description (draft, not submitted)

**Tagline:** Check the outfit you already own against the invitation. Keep it, or preview one justified change.

## What it does
You add an invitation (photo or screenshot) or type the event details. Google Gemini reads the text and proposes the event's requirements, quoting the exact wording; you confirm or edit each one. Then you add one photo of your outfit. Gemini describes only what is visible, and a deterministic rules engine compares that against your confirmed requirements. Every finding names the requirement it comes from, and colour rules cover every visible garment, not just the main piece. When the photo can't answer a requirement — feet out of frame, colour in poor light, vague wording — WearCheck asks a specific question instead of guessing, and a photo where the clothes can't be seen never gets a positive verdict.

If nothing conflicts, *"Keep your outfit"* is the complete result, and you get a downloadable decision card. If something does, WearCheck offers one alternative per finding from a small, licence-documented reference set — only items known to meet the rule they are meant to fix — or you can upload your own. YouCam's virtual try-on renders the item onto your photo. You compare original and preview in one frame (toggle, slider, and a zoom onto the area that changed) before deciding. WearCheck doesn't re-check the generated image, and the preview page and card say so: you judge whether the change resolves the rule.

## How YouCam is used
- **Clothes V4** (`cloth-v4`) for a dress or a top. **Shoes V3** (`shoes-transfer`) for footwear, offered only when the feet are visible.
- A render runs only on an explicit request. It is never retried automatically and is capped per session and per day. Admission (one active job per check, spend caps) is atomic. Reloading mid-render resumes the same job.
- If the connection to YouCam drops while a task is being created, the job says the outcome is unknown and that trying again starts a new paid preview, rather than claiming nothing was generated.
- Results are copied into private storage before the provider URL expires, and are labelled "AI preview — not proof of fit, size or comfort".

## What's verified (2026-11-01, on https://wearcheck.vercel.app)
- **Real renders through the app UI** on the live site and locally, in both categories; counts, latencies and credits are in the README.
- **Hosted browser suite** against the final deployment: public pages (overflow, console errors, accessibility scan, comparison controls on mobile and desktop using recorded outputs), the guest workflow, real Gemini invitation reading, the no-change journey with a 1080×1350 card, and both render categories with downloads, refresh recovery, ownership isolation, deletion, comparison framing and catalogue card widths.
- **Retention cleanup:** exercised on production against labelled expired test records.

## Built with
Next.js 16, React 19, TypeScript, Tailwind CSS 4, GSAP, Motion, Zod, Google Gemini API (free tier), YouCam API, Supabase (Postgres and Storage), Vercel.

## Honesty notes
- The sample invitation in the video is labelled as created for the demo. Example scenarios use requirements entered for the example and are labelled that way.
- The demo video uses the project owner's photo, with their permission for public use in the demo. The site's public showcase uses a CC0 photograph; it has no model release, and the page says so.
- Free-tier Gemini capacity is small. When it runs out or is busy, people are told so and can type the details instead.
- No testimonials, user counts, accuracy figures or shopping features.

## Links and media
- Live app: https://wearcheck.vercel.app
- Source: https://github.com/TheWeirdDee/wearcheck/tree/feat/wearcheck-implementation (the default branch `main` holds only the initial README until the branch is merged). MIT licence for the source; asset licences are listed separately.
- Screenshots: `docs/screenshots/`, taken from the real app.
- Video: `private-ops/video/wearcheck-demo-180s.mp4`, exactly 180 s, with captions and voiceover. It shows a real Clothes V4 render and a real Shoes V3 render, with sped-up waits disclosed on screen. **Not uploaded.**
