# WearCheck — submission description (draft, not submitted)

**Tagline:** Check the outfit you already own against the invitation. Keep it, or preview one justified change.

## What it does
You add an invitation (photo or screenshot) or type the event details. Google Gemini reads the text and proposes the event's requirements, quoting the exact wording; you confirm or edit each one. Then you add one photo of your outfit. Gemini describes only what is visible, and a deterministic rules engine compares that against your confirmed requirements. Every finding names the requirement it comes from. When the photo can't answer a requirement — feet out of frame, colour in poor light, vague wording — WearCheck asks a specific question instead of guessing.

If nothing conflicts, *"Keep your outfit"* is the complete result, and you get a downloadable decision card. If one item is the problem, WearCheck offers a single alternative from a small, licence-documented reference set, or you can upload your own. Examples: a blue shirt when the invitation says "please avoid white or ivory", or loafers or oxfords when it recommends flats for a lawn. YouCam's virtual try-on renders the item onto your photo, and you compare original and preview with a slider before deciding.

## How YouCam is used
- **Clothes V4** (`cloth-v4`) for a dress or a top. **Shoes V3** (`shoes-transfer`) for footwear, offered only when the feet are visible.
- A render runs only on an explicit request. It is never retried automatically and is capped per session and per day. Reloading mid-render resumes the same job rather than creating a new one.
- Results are copied into private storage before the provider URL expires, and are labelled "AI preview — not proof of fit, size or comfort".

## What's verified (2026-11-01, on https://wearcheck.vercel.app)
- **Real renders:** 12, all through the app UI — 6 Clothes V4 and 6 Shoes V3, 6 of them on the live site. Each took 16–26 s and cost 2 credits.
- **Live browser tests:** real Gemini invitation reading, the no-change journey with decision-card download, both render categories with downloads, refresh recovery, ownership isolation and deletion.
- **Retention cleanup:** exercised on production against labelled expired test records. Records and stored files were removed.

## Built with
Next.js 16, React 19, TypeScript, Tailwind CSS 4, GSAP, Motion, Zod, Google Gemini API (free tier), YouCam API, Supabase (Postgres and Storage), Vercel.

## Honesty notes
- Example scenarios use requirements entered for the example and are labelled that way. The sample invitation in the video is labelled as created for the demo.
- The public recorded comparison and the demo video use a **CC0** photograph. The licence permits modification and publication, but no model release exists, and the page says so.
- Free-tier Gemini capacity is small (observed: 20 requests a day on the primary model). When it runs out, people are told so and can type the details instead.
- No testimonials, user counts, accuracy figures or shopping features.

## Media
- Screenshots: `docs/screenshots/`, taken from the real app.
- Video: `private-ops/video/wearcheck-demo-120s.mp4`, exactly 120 s, with captions and voiceover. It shows a real Shoes V3 render, and the sped-up waits are disclosed on screen. **Not uploaded.**
