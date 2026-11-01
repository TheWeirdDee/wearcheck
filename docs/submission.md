# WearCheck — submission description (draft, not submitted)

**Tagline:** Check the outfit you already own against the invitation. Keep it, or preview one justified change.

## What it does
You add an invitation (photo or screenshot) or type the event details. WearCheck uses Google Gemini to read the text and proposes the event's requirements, quoting the exact wording. You confirm or edit each one. Then you add one photo of your outfit. Gemini describes only what is visible, and a deterministic rules engine compares that against your confirmed requirements. Every finding names the requirement it comes from. When the photo can't answer a requirement — feet out of frame, colour in poor light, vague wording — WearCheck asks a specific question instead of guessing.

If nothing conflicts, *"Keep your outfit"* is the complete result, and you get a downloadable decision card. If one item is the problem, you choose a single alternative: a licence-documented reference item or a photo of your own. YouCam's virtual try-on (Clothes V4 or Shoes V3) renders it onto your own photo, and you compare original and preview with a slider before deciding.

## How YouCam is used
- Clothes V4 (`cloth-v4`) for a dress or full outfit, a top, or an outer layer. Shoes V3 (`shoes-transfer`) for footwear, offered only when the feet are visible.
- A render runs only on an explicit request. It is never a default and never retried automatically, and it is capped per session and per day.
- Results are copied into private storage before the provider URL expires, and are labelled "AI preview — not proof of fit, size or comfort".

## What's verified
- Deployed at https://wearcheck.vercel.app. Public pages, guest workflow, deletion, session isolation, cleanup auth and real Gemini invitation reading are verified on the live URL by automated browser tests.
- **YouCam renders have not been run yet:** they are waiting for a permissioned photo. *(Update this line with the task date and latency once a real render exists; until then, don't claim it.)*

## Built with
Next.js 16, React 19, TypeScript, Tailwind CSS 4, GSAP, Motion, Zod, Google Gemini API (free tier), YouCam API, Supabase (Postgres and Storage), Vercel.

## Honesty notes
- Example scenarios use requirements entered for the example and are labelled that way; "Start this example" runs the normal workflow.
- Marketing photos are credited CC0 editorial images and are never shown as WearCheck or YouCam output.
- No testimonials, user counts, accuracy figures or shopping features.
