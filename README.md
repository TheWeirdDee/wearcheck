# WearCheck

**Check the outfit you already own against the invitation. Keep it, or preview one justified change.**

WearCheck reads an invitation (or details you type), asks you to confirm the event's requirements, looks at one photo of your outfit, and explains — requirement by requirement — whether anything conflicts. If nothing does, *"Keep your outfit"* is the result. If one item is the problem, you can choose a single alternative and YouCam's virtual try-on renders it onto your own photo so you can compare before deciding. Either way you can download a decision card.

It is not a styling chatbot, an attractiveness score, an outfit generator or a shop.

- **Live app:** https://wearcheck.vercel.app
- **Repository:** https://github.com/TheWeirdDee/wearcheck — the implementation is on [`main`](https://github.com/TheWeirdDee/wearcheck/tree/main).
- **Licence:** MIT for the source ([LICENSE](LICENSE)); images carry their own licences (see *Assets and licences*)
- **Product spec:** [`WearCheck_Full_PRD_v1.md`](WearCheck_Full_PRD_v1.md)

---

## Status at a glance

What has and hasn't been demonstrated, kept deliberately separate. "Implemented" means the code exists and is covered by type checks and unit tests; only the other two columns are evidence that it works.

| Capability | Implemented | Verified locally | Verified on the live URL |
|---|---|---|---|
| Public pages, theme (light/dark/system), mobile menu, accessibility scan | ✓ | ✓ | ✓ (Playwright, desktop + mobile) |
| Horizontal scroll story (pinned GSAP, reverse, resize, reduced-motion fallback) | ✓ | ✓ | ✓ |
| Guest session, ownership checks, cross-browser denial, CSRF origin check | ✓ | ✓ | ✓ |
| Manual event entry → requirements review → confirm (with revisions) | ✓ | ✓ | ✓ |
| Invitation image → **real Gemini** extraction with exact quotes | ✓ | ✓ | ✓ (sample invitation fixture) |
| Outfit photo → **real Gemini** observation → rule-based assessment → keep → decision card PNG | ✓ | ✓ | ✓ (permissioned owner photo, `live pipeline` e2e) |
| Delete a check (database rows + stored files), and access revoked afterwards | ✓ | ✓ | ✓ (e2e) |
| Scheduled retention cleanup endpoint (secret-protected) | ✓ | ✓ | ✓ (401 without the secret, 200 with it) |
| **YouCam Clothes V4** render, through the UI | ✓ | ✓ 4 runs (blue shirt, black dress, retired navy dress ×2), 16–24 s | ✓ blue shirt, retired navy dress; 6 runs on 1 Nov after the audit fixes, 19–58 s |
| **YouCam Shoes V3** render, through the UI | ✓ | ✓ 2 runs (wedge, loafer), 24–26 s | ✓ wedge, loafer, tan oxford; 5 runs on 1 Nov after the audit fixes, 18–30 s |
| Reload mid-render resumes the same job, with no duplicate provider task | ✓ | ✓ | ✓ |
| Stale-revision handling for renders | ✓ | Unit-level only | ✗ |
| Comparison fits the viewport (feet included), toggle, slider, zoom to the changed area | ✓ | ✓ | ✓ e2e on desktop and mobile (recorded outputs) and in both live render journeys |
| Requirement polarity, multi-garment colour rules, rule-aware references, visibility gate (audit F01–F04) | ✓ | ✓ 32 regression tests (`tests/unit/audit-regressions.test.ts`) | ✓ live: “Please avoid white or ivory” flagged a white shirt under a vest |
| Atomic render admission, unknown-submission state, orphan-safe storage, CSP (audit R01–R04) | ✓ | Type-checked; not fault- or concurrency-tested | CSP header ✓; the others not exercised live (no deliberate paid races) |
| Gemini fallback model on quota errors; honest "quota used up" vs "busy" messages | ✓ | ✓ deterministic tests (`tests/unit/gemini.test.ts`) | Not observed live (no live quota was exhausted on purpose) |
| Serving Gemini model recorded per request (`event_sources.model_id`, `outfit_observations.model_id`) | ✓ | ✓ | ✓ |
| Retention cleanup removes expired records **and stored files** | ✓ | — | ✓ production cron endpoint, labelled expired test records (`scripts/retention-test.mts`) |

**YouCam evidence (2026-11-01).** The usage ledger records **25 completed renders** — 13 Clothes V4 and 12 Shoes V3, latencies 15–58 s — all started through the WearCheck UI, locally or on the live site. Each went invitation or event details → photo with consent → real Gemini findings → one reference item → Generate → completed image displayed in the comparison view.
- Every job created exactly one provider task (`/s2s/v2.0/task/cloth-v4` or `/s2s/v2.0/task/shoes-transfer`, polled until `success`).
- The balance went from 1,040 to 990 units: **2 units per render**, measured before and after.
- **Photos used:** the project owner's photo (private testing, and — with their permission — the demo video), and one CC0 photograph for the public showcase ([docs/public-assets.md](docs/public-assets.md)).
- Task IDs, timestamps and latencies are kept privately in the usage ledger and `private-ops/`.

**Final hosted verification** (commit `0088ef2`, 2026-11-01 17:40 UTC): 40 passed, 4 skipped. The skips are the mobile-menu test on desktop, the pinned story on mobile, and the two paid render journeys on mobile (run once, on desktop, to bound spend; the comparison controls are tested on mobile with recorded outputs).

### Independent audit (1 November 2026) — what changed

| Finding | Fix | Evidence |
|---|---|---|
| F01 “No flats / wedges / boots / trainers” passed or reversed | Polarity is kept per clause; plurals and synonyms are normalised; a prohibition is a hard rule; an unrecognised style becomes a question. Invitation rules are re-read from their quoted wording, so the model's labels can't flip them | Regression tests; the live run turned the model's “colour request” for “Please avoid white or ivory” into an exclusion |
| F02 Colour rules checked only one garment | Every visible garment is checked; several matches are named, and the preview note says the others would stay. Previews and cards say WearCheck doesn't re-check the generated image | Tests; live finding “Your photo shows a white top.” for a white shirt under a vest |
| F03 References could break the rule they fix | Items carry coverage and garment kinds; the finding's own rule must be positively met, and unknown suitability is rejected. The server re-validates the item on Generate | Tests (the sleeveless dress is never offered for “Sleeves required”) |
| F04 Unclear photo could pass | No visible garments or a poor photo means “Not enough information”; “nothing to check” has its own headline | Tests; live no-change run shows “No specific requirements to check against” |
| F05 Video didn't show the change | New 180-second video, with full-body comparisons and zooms on the changed shirt and shoes | `docs/demo-script.md` |
| F06 Narrow catalogue cards | The occasion sidebar appears only from 1280 px; card columns follow the available width (min 15 rem) | e2e asserts cards ≥ 200 px wide |
| F07 Feet below the viewport | The frame is sized to the viewport, scrolled into view on completion, with a synchronized zoom to the area where the images differ | e2e asserts the whole frame is on screen and the zoom engages |
| F08 False-green tests | The no-change and render journeys fail when their preconditions aren't met; the card's PNG size is checked; there's a mobile comparison test without provider calls | `tests/e2e/*.spec.ts` |
| F09 Default branch, no licence | MIT licence added; the README and submission link the implementation branch | Merge to `main` is waiting on the owner |
| F10 Inconsistent retention copy | Everywhere: locks after 24 hours, deleted by the daily cleanup normally within the next 24 hours | Pages updated; privacy page gives the schedule |
| R01 Non-atomic admission | Active-job, spend-cap checks and insert run in one transaction under an advisory lock; rate limits likewise | Type-checked; not race-tested live |
| R02 Lost createTask response | A durable marker before task creation; a lost reply or crash there is reported as “outcome unknown”, with a warning that retrying is a new paid preview | Type-checked; not fault-injected |
| R03 Orphaned images | The asset row is written only for a live check, the object is removed if the insert fails, and deletion sweeps the check's own storage prefix | Type-checked; retention test still passes its earlier run |
| R04 No CSP | A first-party Content-Security-Policy | Live header; full suite passes with it |

Found and fixed while verifying: Gemini calls now share one 48-second budget, so a slow model returns “busy, try again” instead of a platform 504; footwear suggestions keep their styles; an unnamed shoe style is described against the recommended ones; and the card footer no longer overlaps its timestamp.

---

## Architecture

```mermaid
flowchart LR
  B[Browser<br/>Next.js pages] -->|HTTP-only guest cookie| API[Next.js route handlers<br/>on Vercel]
  API -->|direct Postgres, schema wearcheck| PG[(Supabase Postgres<br/>shared project)]
  API -->|service role, bucket wearcheck-private| ST[(Supabase Storage)]
  API -->|invitation + outfit images| G[Google Gemini API<br/>free tier]
  API -->|only on request: photo + reference| Y[YouCam API<br/>Clothes V4 / Shoes V3]
  Y -->|result URL, ~2h| API
  CRON[Vercel cron, daily] --> API
```

### Who decides what

| Component | Responsibility | Never does |
|---|---|---|
| **Gemini** (`lib/ai/gemini.ts`) | Transcribes invitation text and extracts candidate requirements; describes visible garments, colours, footwear and visibility. Output is schema-validated (Zod) and treated as observations. | Decide the verdict; follow instructions found in images; claim certainty about formality, religious or cultural dress, colour in poor light, or approval |
| **Rules engine** (`lib/rules.ts`) | Deterministic assessment against the *confirmed* requirements (PRD §8.4): conflicts, recommendations, insufficient information, clarifying questions. An invitation rule counts as "From invitation" only if its quoted text appears in the transcription. | Invent rules; treat missing feet as approval |
| **YouCam** (`lib/youcam/client.ts`, `lib/jobs.ts`) | Renders one chosen reference item onto the user's photo — Clothes V4 (`cloth-v4`) or Shoes V3 (`shoes-transfer`). | Run without an explicit user request; retry automatically after a failure |

### Routes

Pages: `/` · `/demo` · `/help` · `/privacy` · `/looks` (this browser's checks) · `/check/new` · `/check/[id]/{invitation,requirements,outfit,assessment,options,preview,decision}`

API (all state changes require a same-origin request and the owner's cookie):

| Route | Purpose |
|---|---|
| `POST /api/checks` | Create a guest check (optionally from an example) |
| `GET/DELETE /api/checks/[id]` | Read or delete a check |
| `POST /api/checks/[id]/invitation` | Upload invitation → Gemini extraction |
| `PUT /api/checks/[id]/event` | Manual event details |
| `PUT /api/checks/[id]/requirements` | Confirm requirements (new revision; supersedes assessments) |
| `PUT /api/checks/[id]/outfit` | Upload outfit photo with consent |
| `POST /api/checks/[id]/observe` · `/assessment` | Gemini observation · rule-based assessment |
| `POST /api/checks/[id]/reference` | Upload your own item to try |
| `POST /api/checks/[id]/decision` | Keep or change |
| `GET /api/checks/[id]/decision-card` | 1080×1350 PNG (`?download=1`) |
| `POST /api/render-jobs` · `GET /api/render-jobs/[id]` | Submit and poll a YouCam job (idempotent, leased) |
| `GET /api/media/[id]` | Owner-only image (`?size=thumb`, `?download=1`) |
| `DELETE /api/session/checks` | Delete every check in this browser |
| `GET /api/cron/cleanup` | Retention cleanup and job reconciliation (Bearer `CRON_SECRET`) |

---

## Setup

Requires Node 20.9+.

```bash
npm install
cp .env.example .env.local   # then fill in values — never commit this file
npm run dev
```

### Environment variables

Names only; values live in `.env.local` locally and in the Vercel project settings in production.

| Name | Purpose |
|---|---|
| `YOUCAM_API_KEY` | YouCam server key (Bearer) |
| `YOUCAM_API_BASE` | `https://yce-api-01.makeupar.com` |
| `GEMINI_API_KEY` | Google AI Studio key (free tier) |
| `GEMINI_MODEL` | `gemini-3.5-flash` (verified on the free tier; `gemini-2.5-flash` is closed to new keys) |
| `GEMINI_FALLBACK_MODEL` | Optional; `gemini-3.1-flash-lite`, used only after a quota error on the primary |
| `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` | Storage access (server only) |
| `SUPABASE_DB_URL` | Transaction-pooler connection string (port 6543) for the `wearcheck` schema |
| `SUPABASE_STORAGE_BUCKET` | `wearcheck-private` |
| `SESSION_SECRET` | HMAC key for guest cookies |
| `APP_ORIGIN` | Canonical origin, e.g. `https://wearcheck.vercel.app` |
| `CRON_SECRET` | Protects the cleanup endpoint |
| `RENDER_LIMIT_PER_SESSION` · `RENDER_LIMIT_GLOBAL_PER_DAY` | Paid-render caps (defaults 4 and 60) |

`node scripts/gemini-verify.mjs` lists the models your key can call and makes one tiny image request.

### Database and storage (shared Supabase project)

WearCheck shares a Supabase project with another application (AfterSend). It is isolated as follows:

- A dedicated **`wearcheck` schema**, reached only by the server over a direct Postgres connection. Supabase's API exposure settings were not changed; `anon` and `authenticated` have no usage on the schema, and RLS is enabled with no policies as defence in depth.
- A separate private bucket, **`wearcheck-private`**, created by the app on first use; objects live under `checks/<id>/…`.
- Migrations are additive and versioned (`db/migrations`). The runner refuses `drop`, `truncate`, `delete from`, role or default-privilege changes, extensions, and any reference to another schema.

```bash
npm run db:inspect     # read-only inventory → private-ops/
npm run db:plan        # print exact SQL and run the scope check
npm run db:migrate     # apply, one transaction per file
node scripts/db-fingerprint.mjs <label>            # structural fingerprint of everything that is NOT WearCheck
node scripts/db-fingerprint.mjs --compare a b      # prove nothing else changed
```

The AfterSend check before and after the migration, and again after deployment, was a structural fingerprint of its schemas, columns, constraints, indexes, RLS flags, policies, grants, default ACLs, functions, triggers, API roles, extensions and bucket configuration. All three comparisons were identical. AfterSend's `/api/health` also reported its database OK, and its public pages returned 200, each time. No AfterSend rows were read.

## Build, test, deploy

```bash
npm run typecheck && npm run lint && npm test && npm run build
npx playwright install chromium
E2E_BASE_URL=http://localhost:3001 npx playwright test                       # public + guest workflow
E2E_LIVE=1 E2E_INVITATION=tests/fixtures/sample-invitation.png npx playwright test -g invitation   # real Gemini
E2E_LIVE=1 E2E_PHOTO=<permissioned full-body photo> npx playwright test -g "live pipeline"         # real Gemini, no render
E2E_LIVE=1 E2E_RENDER=1 E2E_PHOTO=<photo> npx playwright test -g "live YouCam renders"           # 2 paid renders (4 units)
npx tsx --conditions=react-server scripts/retention-test.mts <baseUrl>       # labelled expired records → real cleanup → verify
node scripts/screenshots.mjs <baseUrl> <outDir> <light|dark>                 # 320/390/768/1024/1440, overflow + console checks
node scripts/youcam-proof.mjs cloth-v4 <photo> <reference> full_body        # records task id, latency, credits used
node scripts/youcam-proof.mjs shoes-transfer <photo> <reference>
node scripts/youcam-balance.mjs <label>                                     # credit balance, recorded privately
node scripts/youcam-app-journey.mjs <baseUrl> <photo> <exampleIndex> <itemRegex> <label> [answer]   # real render through the UI
```

Deployment: Vercel project `wearcheck`. Deploy with `vercel deploy --prod --build-env WEARCHECK_COMMIT=$(git rev-parse HEAD)`; the live site then reports the commit in an `X-WearCheck-Commit` response header. (framework pinned to Next.js in `vercel.json`), with production env vars set in the dashboard and a daily cron at 04:17 UTC (the Hobby plan allows daily cron only).

---

## Privacy, retention and failure behaviour

- **No accounts.** A random token in an HTTP-only cookie (`__Host-wc_guest` over HTTPS) identifies the browser. The database stores only its SHA-256 hash.
- **Ownership on every request:** a check ID alone opens nothing.
- **Retention:** a check locks 24 hours after it starts. A cleanup that runs daily at 04:17 UTC (and on a few expired checks whenever a new check starts) then deletes its files and rows, normally within 24 hours of expiry. A small usage ledger (provider, feature, task reference, status, timing; no images or text) is kept for budget control.
- **Deletion:** access is blocked first, then storage objects are removed, then rows. Copies held by Google or YouCam follow their own policies, and WearCheck does not claim to delete them.
- **Retention verified:** `scripts/retention-test.mts` seeds labelled, already-expired test records (`demo_case = 'retention-test'`) with real stored files, calls the production cleanup endpoint, and checks the outcome. It refuses to run if any other check is expired. On 2026-11-01 it observed rows and sessions removed and the bucket listing empty immediately. Downloads by the server could still return a **cached copy for 35–68 seconds**; no user-facing route can reach it, because access is revoked first. The privacy page discloses this.
- **Gemini free tier:** Google's unpaid terms allow submitted content to be used to improve its services. The privacy page says so. A 429 on the primary model triggers one attempt on `GEMINI_FALLBACK_MODEL` (also free tier). Free-tier limits can run out together, so this is a best effort, not extra capacity. If every model is limited, people are told the free allowance is used up and offered manual entry. Persistent 5xx "high demand" errors produce a "busy, try again" message instead. Nothing switches to a paid model.
- **YouCam spend:** jobs are idempotent, with a single active job per check. Admission is atomic, per-session and global daily caps apply, and nothing is retried automatically. A task whose creation response was lost is reported as "outcome unknown", never as "nothing generated". "Cancel waiting" stops polling only; it is not claimed to stop provider billing.
- **SSRF:** provider downloads are limited to HTTPS on allow-listed YouCam/AWS hosts, with no redirects and with size caps.
- **Logs** redact URLs, tokens and connection strings, and never record image or invitation contents.
- **Content-Security-Policy:** first-party only (`default-src 'self'`; inline scripts allowed for Next's bootstrap; no framing).

## Assets and licences

- **Editorial photographs** (`public/editorial/`) are CC0 Unsplash originals mirrored on Wikimedia Commons, cropped and colour-graded by `scripts/build-editorial.mjs`. Source, photographer, licence, hash and every modification are recorded in `public/editorial/LICENSES.json`. They illustrate scenarios only: they are labelled on the page, are never presented as a WearCheck or YouCam result, and are not provider-test evidence. The cropped-feet and low-light guide images are edits of one photo and are labelled as such.
- **Reference items** (`public/reference/`) are a contemporary set built by `scripts/build-references.mjs`:
  - **Top:** a blue button-down shirt, the built-in correction for "avoid white or ivory".
  - **Dress:** a black silk dress.
  - **Shoes:** a black tassel loafer, a tan cap-toe oxford, nude pointed heels, a black low block-heel flat and a black wedge sandal.
  - Each is licence-documented (CC BY 2.0, CC BY 4.0, CC BY-SA 3.0, CC BY-SA 4.0), credited in the app and labelled "Visual reference — not a live shopping listing".
  - The script checks each against YouCam's documented rules: at least 512 px per side, a single front-facing garment, and a shoe product covering more than 25% of the image height. The results are recorded in `LICENSES.json`.
  - **Verified with real renders:** shirt, dress, loafer, oxford pair and wedge. Not rendered yet: the nude heels and the low block-heel flat.
  - The dated museum garments were removed. People can still upload their own item for any category.
- **Fonts:** Inter and Inter Tight, SIL OFL 1.1.

## Known limitations

- **Public showcase basis:** it uses a CC0 photograph. That settles copyright but not a model release (see [docs/public-assets.md](docs/public-assets.md)).
- **Previews aren't re-checked:** WearCheck doesn't re-observe the generated image. The public shirt preview left a white T-shirt visible; in the demo, the shirt replaced the white shirt but also the vest and tie. The preview page and card tell people what to look for.
- **Gemini variance:** the same photo was read as loafers in one run and as "not flats or wedges" in another. That's why every finding shows its source, and people can correct details.
- **Not exercised live:** concurrent render admission, a lost YouCam response during task creation, and an asset save racing a deletion. These are handled in code but not fault- or race-tested against the paid provider.
- **Gemini free-tier capacity is small:** the served model allows 5 requests per minute and **20 per day** (observed 429: `generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash`). The optional `GEMINI_FALLBACK_MODEL` (`gemini-3.1-flash-lite`, also free tier) is tried only after a 429; it is a lighter model, so its observations may be less precise. When both are exhausted, users get the manual-entry fallback. Google also returns occasional 503 "high demand" errors, which the app retries once before showing "Try again".
- The editorial set comes from mixed lifestyle shoots rather than a controlled studio session. A shared crop and colour grade bring it closer together, but a commissioned or licensed studio set would be better. Gemini image generation, which could have produced one, is not available on this free tier (429 on every image model).
- The reference catalogue is small: one top, one dress, five shoes, and no outer layer. Other items can be uploaded.
- PDF invitations are not supported; HEIC works only where the browser can decode it.
- The COS website blocks automated browsers, so its layout and motion could not be inspected. The design is WearCheck's own editorial direction and was not copied from COS.

## Demo video

- **File:** `private-ops/video/wearcheck-demo-180s.mp4`, git-ignored and **not uploaded anywhere**. It replaces the 120-second version.
- **Format:** exactly 180.00 s, 1920×1080 H.264 with AAC audio, burned-in captions and a synthesised voiceover (Windows SAPI "Zira").
- **Content:** recorded from https://wearcheck.vercel.app: sample invitation → Gemini reading → confirmation → the owner's photo with consent → "Your photo shows a white top." → **real Clothes V4** render (blue shirt) → comparison and zoom → the shoe finding → **real Shoes V3** render (tan oxford) → comparison and zoom → decision → downloaded card opened → a separate no-change check → the mobile comparison.
- **Disclosures:** each provider wait is sped up with its real duration on screen (Gemini 15.1 s, 9.6 s and 8.6 s; YouCam 33.4 s and 23.8 s, including uploads). Jump cuts are flagged, the sample invitation and the photo's permission are labelled, and two scenes are marked as coming from a second take.
- **Script, cut list and method:** [docs/demo-script.md](docs/demo-script.md); `scripts/demo-record.mjs`, `scripts/demo-edit.mjs`, `scripts/demo-scenes.json`.

## Remaining manual actions

1. **Review the 180-second video**, then authorise submission and any upload. Neither has been done.
2. **Decide whether CC0 without a model release is acceptable** for the site's public showcase ([docs/public-assets.md](docs/public-assets.md)). The video now uses your own photo instead.
3. **Delete the remaining private test checks now, if wanted.** An automatic review rejected a bulk deletion; see below. Otherwise they expire within 24 hours and the scheduled cleanup removes them.

## Rejected bulk deletion (preserved, not bypassed)

The coding agent's attempt to delete *all* WearCheck test checks at once was blocked by the Claude Code automatic-review classifier. The command ran a temporary script through `npx tsx --conditions=react-server` that called `deleteCheck` for every row in `wearcheck.checks`. The stated reason was: *"The server-side auto mode classifier judged this action dangerous (it gave no explanation)."* The deletion was not retried or worked around.

The affected checks hold the owner's private test photos and renders. They remain owner-only and expire 24 hours after creation, and the daily cleanup (or the next opportunistic one) then deletes them. To remove them sooner, either allow that command with a permission rule in Claude Code settings, or run the same per-check deletion yourself. In-app deletion isn't available for these checks, because the test browser sessions that owned them no longer exist.
