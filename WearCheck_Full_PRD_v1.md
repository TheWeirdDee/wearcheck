# WearCheck — Product Requirements Document

**Version:** 1.0 (hackathon release)  
**Date:** 30 October 2026  
**Platform:** Mobile-first responsive web app  
**Status:** Build-ready specification; provider integration assumptions require live verification  
**Product promise:** Know if your outfit works. Fix what doesn't.  
**Owner:** Product/engineering team  
**Primary event:** YouCam API Skin AI & eCommerce VTO Hackathon (submission due 2 November 2026, 11:45 a.m. Eastern)

---

## 1. Executive summary

WearCheck helps someone decide whether an outfit they **already own** is appropriate for a specific occasion. The customer uploads an invitation or enters event requirements, uploads a photograph of the outfit they plan to wear, reviews an explainable assessment, and receives a **minimal-change recommendation**. When a change is worth seeing, the customer chooses a real, correctly attributed reference item and YouCam virtually renders it on their photograph. WearCheck produces a downloadable **Outfit Decision Card** with the original outfit, an AI-generated preview if available, the relevant dress-code requirement, and a concise reason.

**Core differentiator:** Start with the clothes a user owns and change as little as possible. Don't build another generic outfit generator or pretend that an AI can authoritatively interpret every social dress code.

**Dominant live loop:** Real invitation → confirmed constraints → real outfit photo → conflict or no-change verdict → one selected correction → live YouCam render → shareable decision card.

**Product rule:** 'Keep your outfit' is a successful result. Virtual try-on is offered when it genuinely helps; it is not forced to manufacture a purchase recommendation.

## 2. Context, problem, and product hypothesis

### 2.1 Problem
People face ambiguous, occasionally contradictory event-specific clothing requirements. They may own a suitable outfit but cannot confidently determine whether a particular element conflicts with an invitation, venue, or practical restriction. Searching for alternatives creates wasted time and potentially unnecessary purchases. Current styling apps commonly start with finding an outfit; WearCheck starts with a proposed outfit and checks whether **one specific change** would improve it.

### 2.2 Primary job-to-be-done
> When I have an invitation and an outfit I want to wear, help me understand the important restrictions, identify what—if anything—is wrong, and preview the smallest suitable change so I can decide confidently.

### 2.3 Users
- **Primary: Occasion attendee.** Has a specific invitation, a candidate outfit, and limited time or budget. Needs a fast, reasoned answer.
- **Secondary: Cautious shopper.** Wants to compare an existing outfit with one candidate new item before purchasing. Needs visualisation and clear product references.
- **Secondary: Friend/adviser.** Receives a shareable decision card and gives a second opinion, without needing an account.
- **Hackathon evaluator:** Must understand the use case and run one genuine end-to-end scenario without special setup.

### 2.4 Core hypothesis
For users with invitation-specific uncertainty, an explainable, existing-outfit-first workflow with optional virtual try-on is more actionable than broad styling suggestions. **Not yet validated**: retention, willingness to pay, and comparative effectiveness.

### 2.5 Scope boundaries
No claim that the system guarantees social appropriateness, event organiser approval, garment size, physical fit, material quality, comfort, stock availability, or accurate reproduction of all visual details.

## 3. Goals, non-goals and release priorities

### 3.1 Product goals
G1. A first-time user can complete an outfit check without creating an account.  
G2. Every meaningful finding is tied to a stated invitation requirement or clearly labelled heuristic.  
G3. The system can recommend **zero changes** and terminate successfully.  
G4. At least one real YouCam clothing render and one real shoe render function end-to-end.  
G5. Customer can compare original and generated preview and download the decision card.  
G6. A judge can inspect real inputs, real provider task status, and limitations.  
G7. Customer photographs and invitations remain private unless actively shared.

### 3.2 Non-goals (not excluded for arbitrary time reasons)
- No general social feed, followers, public outfit gallery, or fashion community: dilutes the invitation-to-decision mechanism.
- No automated checkout, payments, affiliate commissions, or live price crawling: not needed to prove the decision and could introduce false availability claims.
- No medical or body-shape advice, attractiveness scores, gender identification, age guessing, or emotional inference.
- No auto-generated new garments with invented purchasable SKUs.
- No guarantee of accurate virtual fit or fabric drape.
- No multi-person photo support; single consenting adult photo only.
- No automatic publishing of images.
- No skin analysis: unrelated to the selected problem.

### 3.3 Release levels
**P0 / must work at submission:** guest session; invitation upload/text entry; extraction + user confirmation; candidate outfit upload; photo preflight; grounded analysis with no-change state; explicit conflict/reason; curated fix selection; YouCam Clothes V4 rendering; YouCam Shoes V3 rendering; compare; downloadable card; privacy and deletion; real demo scenarios; error recovery; provider-usage logging.

**P1 / ship if it strengthens the same mechanism:** use the exact same source image to sequentially apply a garment and shoe modification *only if live testing proves preservation*; optional share links; optional account history; user-uploaded reference garment; two alternative suggestions; event requirement re-edit.

**P2 / future, outside current mechanism:** browser extension, retailer integrations, size recommendations, secondhand inventory feeds, wardrobe database, collaboration and monetisation.

## 4. Experience principles and information architecture

### 4.1 Experience principles
1. **Invitation first.** Context determines recommendations.
2. **Keep before replace.** Never invent reasons to shop.
3. **Explain before generating.** Show the exact issue before charging API units for a render.
4. **One decision at a time.** Surface one dominant finding and a compact list of secondary observations.
5. **Respect uncertainty.** User must confirm extracted requirements; subjective inference cannot masquerade as a rule.
6. **Live and honest.** Distinguish original photo, generated image, user-confirmed details, and AI-suggested concerns.
7. **Not a beauty score.** No numeric attractiveness or body ranking.

### 4.2 Route map
- `/` — Public landing and start.
- `/check/new` — New check; creates guest-owned session.
- `/check/[id]/invitation` — Invitation upload or requirements entry.
- `/check/[id]/requirements` — Review and edit extracted requirements.
- `/check/[id]/outfit` — Outfit upload, guidance, image verification.
- `/check/[id]/assessment` — Findings, confidence, and suggested smallest fix.
- `/check/[id]/options` — Choose or provide a reference item.
- `/check/[id]/preview` — Rendering state and before/after comparison.
- `/check/[id]/decision` — Final result and decision card.
- `/looks` — Optional signed-in history; guests see current session only.
- `/demo` — Licensed/consented examples that judges can run live.
- `/privacy` — Data use, retention, and deletion policy.
- `/help` — Photo guidance and FAQ.

All `/check/[id]` pages use a shared lightweight application shell and server-side session authorisation. Random IDs alone are **not** authentication.

### 4.3 Global page shell
**Mobile:** Narrow top bar: WearCheck wordmark left, unobtrusive `How it works` icon/right. Under it, horizontal 4-step progress line (Event / Outfit / Check / Preview) with current step emphasised. Content is one column; primary action is a full-width sticky button above the safe-area inset. Back action returns to the previous step without data loss. Informational text appears close to the control it explains.

**Desktop:** Top navigation in a max-width container. Main workflow split into a narrow left column showing the active step and factual event context, and a larger right column containing the action card or image. For compare and decision pages, the photograph receives most of the horizontal space. Never make the user read a marketing page before completing the workflow.

**States:** Every page has explicit empty, busy, success, recoverable error, and non-recoverable error presentations. Inputs stay available after a temporary error.

## 5. Detailed screen specifications

### S01 — Landing (`/`)
**Purpose:** Establish use case within five seconds, then start.

**Above the fold:** Top-left wordmark. Eyebrow `OUTFIT CHECK FOR REAL OCCASIONS`. Prominent headline `Not sure if your outfit fits the dress code?` Supporting line `Show us the invitation and what you're wearing. Keep what works; preview a better option only when needed.` Primary button `Check my outfit`; secondary text link `See a real example`.

**Hero visual:** A believable split composition: invitation excerpt with highlighted `Outdoor ceremony · flats or wedges` beside a person wearing a complete outfit. An annotation points at shoes; a second frame shows a virtual footwear substitution. Captions mark generated visuals, if applicable. Do not present a fake rendered image as a real product test.

**Below:** Compact three-step explanation (1. Add the invitation, 2. Show your outfit, 3. Keep it or try a change). A small before-and-after module; trust panel `Your photo stays private`, `No account required`, `AI previews aren't proof of fit`; footer with privacy/help. No testimonial or savings numbers without evidence.

**Interaction:** CTA creates an anonymous check and routes to invitation step. Example uses a permissioned case; any pre-rendered asset is labelled `Example image` and user can trigger a new live run in demo.

### S02 — Invitation (`/check/[id]/invitation`)
**Layout:** Heading `What's the occasion?` and helper `Add an invitation, screenshot or the details you received.` Two tabs: `Upload invitation` (default) and `Enter details`. Upload card with camera icon, drag/drop on desktop, `Choose image` / `Take photo` on mobile. Formats: JPG, PNG, HEIC where supported by the parser, and one-page PDF after server-side rasterisation. A thumbnail, filename, `Replace`, and `Remove` controls appear once attached.

**Manual form:** Occasion type (wedding, work, celebration, religious event, other), dress-code free text, location context (indoor/outdoor/unknown), restrictions/free text, optional event date. Optional fields stay optional; no assumption that `formal` has a universal definition.

**Bottom:** `Continue` triggers extraction, shows `Reading the invitation...` while processing. Manual mode continues directly to review. Small privacy note `We use these details only to check this outfit.`

**Errors:** Unsupported format, blank file, oversized image, unreadable invitation, text extraction failed. Fall back to manual entry, not a dead end.

### S03 — Confirm requirements (`/check/[id]/requirements`)
**Purpose:** Make user—not the model—the authority on event requirements.

**Visual:** Card headed `Here's what we understood`. Event label at top. Editable requirement chips grouped as `Dress code`, `Colour restrictions`, `Venue & conditions`, `Footwear`, `Other notes`. Each has value and a small source marker: `From invitation`, `Entered by you`, `Suggested—confirm`. If source extraction includes a legible crop, tapping a field opens the source fragment; never fabricate one.

**Interaction:** Add / edit / remove any field. Show `We couldn't find a clear dress code` rather than guessing. Required before continuing: user confirms at least an occasion or dress-code context; explicit `No restrictions stated` is allowed. CTA `These details are correct`.

**Acceptance:** Editing a rule invalidates older assessments and recommendations, but preserves the uploaded photograph. Reanalysis happens on the new rules revision.

### S04 — Outfit upload (`/check/[id]/outfit`)
**Layout:** Heading `Show us what you're planning to wear`. Main upload area with illustrated silhouette/camera framing guide. Under it: three visual hints `One person`, `Face and clothing visible`, `Include your shoes for a shoe check`. Upload takes camera/gallery/desktop drag-drop. After upload, show large uncropped image with `Retake`, `Change photo`, `Continue`.

**Photo preflight:** Client handles file MIME/size/orientation; server checks decoding, image dimensions and single-person detection via vision analysis and optionally YouCam's multi-person filter on the render. For shoe checks, full feet need to be visible; if not, user can continue for garment assessment but sees `We won't evaluate or preview shoes from this photo`.

**Consent:** Checkbox `This is my photo, or I have permission from the person shown, and they are an adult. I understand AI-generated previews may change appearance.` No pre-checked consent.

**No account:** `You can finish this check without signing up.`

### S05 — Analysis progress
May occupy the assessment route during processing. A two-part content skeleton: invitation facts left/top, outfit thumbnail right/below. Progress copy shows actual pipeline events: `Reading outfit details`, `Comparing against confirmed requirements`, `Preparing your assessment`. No fictitious percentage. An error panel allows `Try again` or `Edit requirements` without losing photo.

### S06 — Assessment (`/check/[id]/assessment`)
**Hero:** Original photograph, event name, and a grounded status badge:
- `Looks compatible with the stated requirements` — no definite conflict and adequate visibility; not an absolute approval.
- `One change worth considering` — a possible issue or practical recommendation.
- `Potential dress-code conflict` — clear contradiction with a user-confirmed explicit rule.
- `Not enough information` — material requirements or clothing visibility uncertain.

**Key finding card:** One sentence in conversational language; e.g., `Your dress appears compatible. The invitation recommends flats or wedges because the ceremony is outdoors.` A small `Why?` expander shows the exact rule text and whether the finding is explicit or a suggestion.

**Breakdown:** Three collapsible rows `Clothing`, `Colour & restrictions`, `Shoes & venue`. Status values `No clear issue`, `Needs a look`, `Conflicts with a stated rule`, `Can't assess`. Avoid percentage scores and moral language. Each row gives observation, evidence source, uncertainty and possible correction.

**Primary action:** If change suggested, `Preview the smallest change`; secondary `Keep this outfit`, `Correct my outfit details`, `Edit event`. If no-change, primary `Save my outfit check` and optional `Explore alternatives` explicitly marked optional. In uncertainty state, ask a specific correction question before any confident verdict.

### S07 — Choose correction (`/check/[id]/options`)
**Heading:** `Let's fix the shoes—not the whole outfit` (dynamic by finding). Subheading states the reason and displays a miniature original outfit.

**Reference catalogue:** Two or three item cards max initially. Each shows clean, licensed product/reference photograph; precise category; short name; tags relevant to requirement (e.g., `Flat sole`, `Outdoor-friendly`); `Try this` button. If authentic retailer metadata is available, display retailer and working outbound product link. If the item is a styling reference only, show `Visual reference · not a live shopping listing`, with **no** Buy button. No invented prices or inventory.

**Bring your own alternative:** Secondary upload `I have another item to try`, accepting a photograph meeting YouCam reference specifications. Ask user to select the category (dress/upper/lower/outer/shoes); validate against what the API supports and the issue being addressed. For lower-body references, follow current YouCam restrictions (worn outfit may be required).

**Preview panel:** Selected item becomes sticky on desktop/right sidebar or bottom summary on mobile, with `Generate preview` as primary CTA. Show explicit `AI-generated image; not a fit guarantee` beside it. Disable repeated submission while the same request is running.

### S08 — Live rendering (`/check/[id]/preview`)
**Before task:** Original photo and chosen item visible together; button `Generate preview` creates server-owned render job. If multiple categories are requested, queue steps visibly with their own status, but never promise the final composite will preserve all earlier changes without validation.

**Running:** Side-by-side layout with original on left and a branded placeholder on right. Timeline messages from real job states `Reference ready`, `Sent to YouCam`, `Generating preview`, `Saving result`. Copy `You can leave this page and return to this check` only if job persistence is implemented. Poll backend; no fabricated completion progress. Offer `Cancel waiting` (stops UI waiting, not an already-submitted provider task).

**Success:** Rendered image fills right panel. A labelled `Original / AI Preview` draggable comparison slider works on desktop and touch; also offer two-button toggle for accessibility. Beneath: specific item, why suggested, `Download image`, `Use this look`, `Try another item`, `Keep original`.

**Failure:** Explain understandable reason: `We couldn't use that photo`, `The reference item wasn't clear`, `The preview failed`, `Service is busy`. Give contextual next action and avoid automatic repeated paid rerenders. An existing original and assessment remain accessible.

### S09 — Decision (`/check/[id]/decision`)
**Purpose:** End the workflow with a useful artifact, not a generic dashboard.

**Layout:** Heading `Your outfit decision`. Two states: `Keep what you have` or `Consider this one change`. Selected image dominant, original visible in secondary thumbnail; card summary below.

**Decision card content:** Occasion name; date if provided; source of dress code; concise compatibility status; original outfit thumbnail; optional labelled AI-generated comparison; one key recommendation; its evidence; chosen reference item and attribution; footnote `Style guidance, not event organiser approval or a guarantee of fit`; generated timestamp.

**Actions:** Primary `Download decision card` (PNG from server or browser canvas; no private URLs in output), `Download preview` if available, `Start another check`. Optional `Share privately` produces a revocable, expiring capability link and warns it reveals images. `Delete this check` accessible from menu.

**No-change state:** No stock product slots or purchase buttons. Success visual should feel complete without a paid render.

### S10 — Demo (`/demo`)
**Purpose:** Judge access and reproducibility, not staged fake functionality.

Three clearly differentiated, permissioned real-world scenarios, each with a real or licensed user image and actual invitation or directly entered requirements:
1. Outdoor formal event; high heels may be impractical; live shoe replacement.
2. Explicit colour exclusion; user confirms garment colour if vision is uncertain; one clothing alternative, live Clothes V4.
3. Outfit appears compatible; no unnecessary change or render.

Each tile shows a short one-line challenge and button `Run this example`. Runs begin with visible input and make genuine calls where applicable. Pre-existing snapshots may be offered as `Previously generated reference` for comparison but **not** presented as the result of a fresh call. Track demo API usage with quotas and protect against abuse. `/demo` must not require login or payment for judges.

### S11 — Help, privacy, optional history
**Help:** Two illustrated sections: `Take a good photo` and `Understand the verdict`. FAQ explicitly explains ambiguity, output differences, lack of sizing guarantees, and why an event organiser's actual instructions override the app.

**Privacy:** Plain language: what is uploaded, processors, storage period, deletion, optional sharing, public/private defaults. Provide `Delete current check` prominently.

**History:** If implemented, card grid with event, date, status and thumbnail; clicking opens decision; `Delete`. Guest-only experience may intentionally omit cross-device persistence.

## 6. Canonical customer flows

### Flow A — No-change outcome
Landing → invitation/text → confirm requirements → photo → grounded assessment `Looks compatible` → decision card → download. **No YouCam call is required when no preview is requested.** This is a legitimate successful outcome and should be in tests and demo.

### Flow B — Footwear correction
Invitation says `formal, outdoor garden, flats/wedges recommended` → photo includes full body and feet → analysis identifies `practical concern`, not mandatory prohibition → user selects licensed flat/wedge reference → confirm → Shoes V3 render → compare → decision card. If feet not visible, request new photo or provide written advice without a deceptive preview.

### Flow C — Garment conflict
Invitation explicitly says `no white or ivory` → user photo appears pale/white → if image colour uncertain, ask `Is your outfit white, ivory or another shade?` → if user confirms prohibited colour, present hard conflict → pick alternate dress reference → Clothes V4 task → compare → card.

### Flow D — Unclear requirements
Invitation text `dress to impress` → model flags ambiguity → user adds practical context → assessment remains advisory → no invented hard rules → user may keep original or try a voluntary alternative.

### Flow E — Provider failure
Render queued → provider `error` or transport issue → show user original/assessment/reference + truthful error + `Choose another image`/`Try again` (explicit new task) → preserve session and log error; don't charge again invisibly.

### Flow F — Session return
User leaves during render and returns on same browser → guest cookie resolves owned session; preview page polls stored provider task ID; result is recovered and copied before signed provider URL expires. If guest session expired, explain retention and offer a new check.

## 7. Functional requirements with acceptance criteria

| ID | Requirement | Priority | Acceptance criterion |
|---|---|---|---|
| FR-01 | Create anonymous check | P0 | Click CTA, receive session and secure guest ownership cookie; refresh retains session. |
| FR-02 | Add invitation via upload or manual entry | P0 | JPEG/PNG and manual entry work; PDF/HEIC only enabled after tested conversion. |
| FR-03 | Extract structured event requirements | P0 | Returns valid schema with source attribution and uncertainty; user can edit every field. |
| FR-04 | Confirm requirements before assessment | P0 | Analysis cannot run against unreviewed model-only restrictions. |
| FR-05 | Upload and validate outfit photo | P0 | Enforces consent and file limits; catches unusable/single-person/feet-not-visible issues; helpful retake route. |
| FR-06 | Analyse clothing and footwear observations | P0 | Structured output distinguishes visible facts, model guesses, and user confirmations. |
| FR-07 | Evaluate explicit rules and practical advice | P0 | Every finding references a rule/observation; subjective style is not a hard violation. |
| FR-08 | Minimal-change recommendation | P0 | Ranks one necessary/valuable intervention before replacing whole outfit; supports keep-as-is. |
| FR-09 | Choose real reference garment/shoes | P0 | Only licensed assets, valid category, and authentic item metadata; optional user-provided image. |
| FR-10 | Execute YouCam Clothes V4 | P0 | Valid upload + task submission + polling + rendered output; no browser API key. |
| FR-11 | Execute YouCam Shoes V3 | P0 | Valid footwear reference + task + polling + output; supported parameters verified. |
| FR-12 | Show job lifecycle and recovery | P0 | Refresh/revisit works; failure never leaves spinner indefinitely; duplicate calls blocked. |
| FR-13 | Compare original and preview | P0 | Labels visible; toggle and slider keyboard-accessible; no claim of physical fit. |
| FR-14 | Download decision artifact | P0 | PNG contains event, verdict, reason, source, original, optional rendered result, disclaimer. |
| FR-15 | Delete check and private assets | P0 | Owner deletes app storage rows/assets and access is revoked; third-party deletion limits disclosed. |
| FR-16 | Judge examples | P0 | Three curated cases, no credentials/paywall, real results visibly distinguished from snapshots. |
| FR-17 | Optional expiring share link | P1 | Explicit consent, expiration/revoke, no indexing; owner can invalidate it. |
| FR-18 | Render combined clothing + shoes | P1 conditional | Only enable after real sample checks prove output consistency and no unwanted change; otherwise separate previews. |
| FR-19 | Signed-in saved history | P1 | Optional account linking respects prior guest ownership; RLS blocks cross-user access. |

## 8. Requirements and decision engine

### 8.1 Structured event model
Use an LLM with OCR/vision input to produce an exact JSON schema, not free-form verdict prose. Example:

```json
{
  "event_type": "wedding",
  "dress_code": { "value": "formal", "source": "invitation", "confidence": 0.94 },
  "venue": { "setting": "outdoor", "surface": "grass", "source": "invitation", "confidence": 0.97 },
  "rules": [
    { "id": "r1", "type": "footwear_preference", "value": "flats_or_wedges", "severity": "advisory", "evidence_text": "Flats or wedges recommended", "source": "invitation" },
    { "id": "r2", "type": "colour_exclusion", "value": ["white", "ivory"], "severity": "hard", "evidence_text": "Please avoid white or ivory", "source": "invitation" }
  ],
  "uncertainties": []
}
```

`confidence` is a model estimate, **not calibrated probability**. Never show `94% certain` to customers. A visible or user-confirmed source takes precedence over inferred convention.

### 8.2 Structured outfit observations
Model produces only observable characteristics + uncertainty: garments present, broad colour family, approximate silhouette, footwear type/heel style when visible, occlusions, image quality. Example:

```json
{
  "visible_items": [
    { "category": "dress", "colour_family": "dark_blue", "visibility": "clear", "source": "image_model" },
    { "category": "shoes", "style": "stiletto_heel", "visibility": "clear", "source": "image_model" }
  ],
  "unobservable": ["fabric_quality", "actual_heel_stability", "garment_fit"],
  "follow_up_questions": []
}
```

No body type, perceived age, gender, ethnicity or attractiveness categories. Vendor shoe API may require a `gender` parameter in some example versions; ask the user for a **rendering option** only if the exact version requires it, never infer identity from their face. For V3, use parameters in the verified V3 OpenAPI schema.

### 8.3 Finding model
```json
{
  "rule_id": "r1",
  "category": "footwear",
  "kind": "practical_advice",
  "status": "consider_change",
  "severity": "medium",
  "observation": "The shoes appear to have narrow heels",
  "reason": "The event is on grass and the invitation recommends flats or wedges",
  "evidence_source": "invitation",
  "user_action": "preview_flat_or_wedge",
  "requires_confirmation": false
}
```

### 8.4 Deterministic decision policy
1. If required information is missing, return `unknown` and request one targeted clarification.
2. Evaluate explicit hard rules first: e.g. **user-confirmed** white outfit versus explicit no-white rule. `conflict` only when both sides are adequately confirmed.
3. Evaluate explicit preferences next, classified as `recommendation`, never automatically `violation`.
4. Evaluate practical venue considerations, clearly labelled `Styling suggestion` or `Practical consideration`, never `Event rule`.
5. For subjective formality or modesty, use `may not match` with rationale and invite user correction; do not assert cultural universals.
6. Rank feasible improvements by (a) explicit-rule relevance, (b) practical benefit, (c) number of items changed—fewer is better, (d) confidence of observation, (e) whether a valid reference item exists.
7. If no meaningful issue, return `keep_as_is`; never force a virtual render to satisfy a sales funnel.
8. LLM extracts and proposes observations; **typed application logic controls** final outcome, priority, and action eligibility. Preserve all sources and revision IDs for traceability.

### 8.5 Revision logic
Requirements or user-corrected outfit details have `revision_number`. Every assessment references a requirements revision and photo asset ID. On edit, flag prior assessment `superseded`; never display stale conflict as current. Existing renders stay labelled with the reference and old conditions until user chooses a new evaluation.

### 8.6 Example decision table
| Invitation | Outfit observation | Allowed verdict | Preferred action |
|---|---|---|---|
| Outdoor / wedges recommended | Thin heels visible | Consider change | Offer flat/wedge preview |
| Explicit no ivory | Ivory colour confirmed | Conflict with stated rule | Offer alternative garment |
| Formal but no further restrictions | Dress appears formal | Looks compatible, advisory | Keep existing outfit |
| `Festive chic` only | Outfit unclear | Cannot determine | Ask user to clarify |
| Garden venue | Shoes not visible | Cannot assess footwear | Request full-length photo or skip shoes |

## 9. Recommendation catalogue

### 9.1 Catalogue strategy
Use a deliberately small, reviewed set of references for the hackathon: approximately 6–12 items across flats, wedges, dresses, outerwear, and upper-body garments. Each product must have a usage-permitted image, relevant metadata and correct image framing; no arbitrary internet scraping or unlicensed third-party brand marks in the film.

### 9.2 Item fields
`id`, `title`, `category`, `image_asset_id`, `source_name`, `source_url` (nullable), `image_licence`, `sku` (nullable), `availability_verified_at` (nullable), `is_purchasable` (boolean), `tags[]`, `colours[]`, `formality_tags[]`, `terrain_tags[]`, `provider_ref_file_id` (nullable), `enabled`.

### 9.3 Matching
Filter by relevant conflict, supported render category, photo compatibility and verified image metadata. Rank neutral/occasion-suitable, preserve user outfit, minimize extra changes. Do not infer user budget; optional manually selected `Budget doesn't matter / Prefer low-cost / Already own an option` can influence text suggestions, but no fabricated prices.

### 9.4 Item reference handling
The exact reference item used to render is the item shown in the decision card. Do not substitute a different marketing image after rendering. For a user-uploaded alternative, mark it `Provided by you` and don't create a fake product listing.

## 10. YouCam integration specification

### 10.1 Verified provider surfaces (30 Oct 2026)
- **File registration:** `POST /s2s/v2.0/file` → `file_id`, presigned `requests.url`; `PUT` bytes with returned headers.
- **Clothes V4 submit:** `POST /s2s/v2.0/task/cloth-v4` with `src_file_id` or URL, `ref_file_id` or URL, and `garment_category`. Allowed documented categories: `full_body`, `lower_body`, `upper_body`, `shoes`, `auto`, `outer`. Set `filter_multi_person: "normal"` and, for full-body/lower-body garment changes, `change_shoes: false` to preserve shoes unless intentionally changing them.
- **Clothes V4 status:** `GET /s2s/v2.0/task/cloth-v4/{task_id}`.
- **Shoes V3 submit:** `POST /s2s/v2.0/task/shoes-transfer` with source/reference file identifiers. **Verify optional parameter schema against V3**: older examples mention `gender` and `style`, while the V3 request example does not require them; do not blindly copy old fields.
- **Shoes V3 status:** `GET /s2s/v2.0/task/shoes-transfer/{task_id}`.
- Success returns `data.task_status = "success"` and `data.results.url`; `error` is terminal failure. Signed result URLs are temporary; copy the image into private first-party storage as soon as possible.
- Current published pricing: Clothes V4 2 units/render; Shoes V3 2 units/render. Verify live account usage in API console (do not assume failures are free).

### 10.2 API upload sequence
1. Browser uploads photo to private Supabase Storage using a server-issued signed upload URL and secure session ID.
2. Backend validates MIME signature, pixel dimensions, consent and asset ownership; strips EXIF and normalises orientation, optionally compressing to supported JPEG/PNG without misleading visual enhancement.
3. Backend calls YouCam File API to get `file_id` and signed PUT endpoint.
4. Backend sends exactly the bytes/headers required to the provided URL. Never pass bearer API key to browser, logs, or URL parameters.
5. Cache provider file ID for the same unmodified asset where allowed and valid. For reference items, pre-upload and cache IDs if YouCam retains them as needed; recover if invalidated.
6. Backend creates the correct render task and persists provider task ID and input asset hash.
7. Browser polls WearCheck `GET /api/render-jobs/{jobId}` every ~5–10 seconds; backend throttles provider polling to ~10 seconds per job and updates state.
8. On success, backend retrieves temporary output URL and stores a private copy, creating `media_assets` row; return a short-lived signed internal URL to the owner.
9. On error, record mapped status and remediation, preserving original image and assessment.

### 10.3 Render job state machine
`draft → validating → uploading_source → uploading_reference → submitted → processing → persisting_result → completed`, with terminal `failed` and optional `expired`. Provider may report other statuses; adapter maps them to local states, retaining raw response for server-side diagnostic logs without personally identifying text. A repeated frontend request with same session, reference, category and input asset revision returns the existing active or completed job (idempotency key), not a second paid task. A new explicit `Try again` creates an incremented attempt.

### 10.4 Combined edits
A garment change and shoe change in the same look are **two tasks**. If a user elects both and image compatibility passes, apply a second render against the persisted output of the first, keeping each intermediate image. Do **not** claim the second engine will preserve the first render or face consistently until checked on real samples. If it fails QA, show two independently generated options from the original photo and do not present a fabricated merged photo.

### 10.5 Quotas and costs
Use `api_usage_events`: feature, estimated units, actual units if measurable, status, provider task ID, timestamp, associated demo case. Public/judge demo uses bounded rate limits and per-session limits, but judges retain free access during the required judging period. Free hackathon credits can support up to ~500 two-unit renders in the simplest accounting before other expenses/failed tasks; **this is arithmetic, not a promise of actual available successful renders**.

### 10.6 Integration uncertainty that must be tested live
- Exact V3 shoe optional fields and rendered appearance.
- Whether Clothes V4 handles all selected categories/poses satisfactorily.
- Multi-person filtering and source framing errors.
- Task polling timing, rate limits, failures and signed URL expiry.
- Multi-step garment-and-shoe preservation.
- Current provider credit accounting and terms.

## 11. Technology architecture

### 11.1 Selected stack
- **Frontend:** Next.js App Router + React + TypeScript; responsive web.
- **Styling components:** Tailwind CSS and accessible headless components (no design-token specification in this PRD).
- **Backend:** Next.js route handlers / server-only services; Zod for input schema validation.
- **Database:** Supabase Postgres.
- **Storage:** Private Supabase Storage buckets for originals, invitations, reference uploads, and results; signed URLs only.
- **Anonymous sessions:** Secure HTTP-only signed cookie backed by database; optional Supabase Auth for later account linking.
- **AI extraction:** Server-side multimodal/vision model with structured JSON outputs. Pin a model identifier in configuration, record model version and test against actual invitations; do not promise performance before measurement.
- **Provider:** Server-side YouCam API adapter (Clothes V4, Shoes V3).
- **Deployment:** Vercel for web/API; if serverless execution constraints require persistent task finalisation, use scheduled backend reconciliation or a small worker. Never rely on in-memory state in a Vercel function.
- **Observability:** Structured app logs and basic event counters; mask sensitive content and tokens.

### 11.2 Components
`Upload service` manages consent, file validation and private storage. `Invitation parser` extracts requirements. `Outfit observer` extracts visible garment attributes. `Rules engine` generates grounded findings. `Recommendation service` filters approved catalogue options. `YouCam adapter` handles file registration/tasks/status/results. `Job reconciler` resumes and persists results after browser return. `Decision-card generator` produces final PNG. `Privacy service` handles expiry/deletion.

### 11.3 Important security architecture
Provider credentials **never** go to the browser. All resource reads/writes check session ownership, even with a UUID URL. Guest sessions use encrypted/signed HTTP-only cookies and server-side random tokens; asset access uses short-lived signed URLs. Supabase service-role operations remain server-side only; enable RLS for user tables. All external HTTP destinations are provider-approved and not user-supplied URLs to prevent SSRF. Uploads are not publicly browsable or indexed.

### 11.4 Suggested repository layout
```text
app/
  page.tsx
  demo/page.tsx
  check/new/route.ts
  check/[id]/{invitation,requirements,outfit,assessment,options,preview,decision}/page.tsx
  api/{checks,media,analyse,assess,options,render-jobs,decision-cards,share,delete}/...
components/
  app-shell/ invitation/ photo-upload/ findings/ catalogue/ render-preview/ decision-card/
lib/
  auth/ db/ storage/ schemas/ ai/ rules/ recommendations/ youcam/ jobs/ privacy/ analytics/
  youcam/{client.ts,file-upload.ts,clothes-v4.ts,shoes-v3.ts,normalize-error.ts}
tests/
  fixtures/ unit/ integration/ e2e/
public/
  allowed-reference-assets/
README.md
.env.example
```

## 12. Data model

Use UUID primary keys, `created_at`, `updated_at`, and soft-delete/archive where necessary. Suggested tables:

| Table | Key fields | Purpose |
|---|---|---|
| `check_sessions` | `id`, `owner_user_id?`, `guest_session_hash?`, `status`, `current_step`, `requirements_revision`, `expires_at`, `deleted_at` | Ownership and lifecycle |
| `media_assets` | `id`, `check_id`, `kind`, `storage_key`, `mime`, `width`, `height`, `sha256`, `origin`, `consent_record_id?`, `expires_at` | Private image provenance |
| `event_sources` | `id`, `check_id`, `asset_id?`, `manual_text?`, `source_type` | Invitation inputs |
| `event_requirements` | `id`, `check_id`, `revision`, `json`, `confirmed_at`, `confirmed_by`, `model_id?` | Confirmed structured restrictions |
| `outfit_observations` | `id`, `check_id`, `photo_asset_id`, `json`, `model_id`, `reviewed_at?` | Photo observations |
| `assessments` | `id`, `check_id`, `requirements_revision`, `photo_asset_id`, `status`, `findings_json`, `created_at`, `superseded_at?` | Grounded findings |
| `catalogue_items` | `id`, `category`, `title`, `image_asset_id`, `source_url?`, `licence`, `tags_json`, `active` | Curated reference items |
| `recommendations` | `id`, `assessment_id`, `finding_id`, `catalogue_item_id?`, `user_ref_asset_id?`, `rank`, `reason`, `chosen_at?` | Options and selections |
| `render_jobs` | `id`, `check_id`, `provider`, `feature`, `provider_task_id?`, `source_asset_id`, `reference_asset_id`, `input_revision`, `status`, `result_asset_id?`, `attempt`, `idempotency_key`, `error_code?`, `started_at`, `completed_at?` | Async provider lifecycle |
| `decision_cards` | `id`, `check_id`, `assessment_id`, `selected_render_job_id?`, `asset_id`, `disclaimer_version`, `created_at` | Shareable final artifact |
| `share_links` | `id`, `card_id`, `token_hash`, `expires_at`, `revoked_at?` | Optional revocable sharing |
| `consent_records` | `id`, `check_id`, `statement_version`, `accepted_at`, `source`, `ip_hash?` | Permission record |
| `api_usage_events` | `id`, `render_job_id`, `feature`, `units_estimated`, `units_actual?`, `status` | Credit visibility |
| `product_events` | `id`, `check_id?`, `event_name`, `metadata_safe_json`, `occurred_at` | Privacy-aware analytics |
| `demo_cases` | `id`, `slug`, `consented_assets`, `requirements_json`, `expected_behavior`, `active` | Reproducible judge paths |

**Indexes and constraints:** unique `(check_id, requirements_revision)`; unique render-job idempotency key; indexed `provider_task_id`, `status`, `expires_at`; foreign keys cascade or controlled delete. No customer photo bytes in model logs, telemetry or database JSON.

## 13. Internal HTTP API contracts

All endpoints require CSRF protections as applicable, input validation, rate limiting, and secure guest/user session authorisation. Status codes and error envelopes must be consistent.

| Route | Method | Request → Response |
|---|---|---|
| `/api/checks` | POST | `{}` → `{checkId,nextPath}` and owner cookie |
| `/api/checks/:id` | GET | Owned check state and step summary |
| `/api/checks/:id/event` | PUT | `{sourceAssetId?, manualDetails?}` → extraction job/status |
| `/api/checks/:id/requirements` | PUT | `{revision, requirements}` → `{revision, confirmed:true}` |
| `/api/checks/:id/outfit` | PUT | `{assetId, consentAccepted}` → photo validation status |
| `/api/checks/:id/observe` | POST | `{}` → structured observations or clarifying question |
| `/api/checks/:id/assessment` | POST | `{requirementsRevision, photoAssetId}` → findings and outcome |
| `/api/checks/:id/options` | GET | Ranked catalogue items and eligibility |
| `/api/render-jobs` | POST | `{checkId, recommendationId, idempotencyKey}` → `{jobId,status}` |
| `/api/render-jobs/:id` | GET | Owner-authorised lifecycle, safe status and completed image URL |
| `/api/checks/:id/decision-card` | POST | `{assessmentId, selectedJobId?}` → `{cardId,downloadUrl}` |
| `/api/checks/:id/share` | POST | Explicit `{cardId,expiresIn}` → share URL if enabled |
| `/api/checks/:id` | DELETE | Delete/revoke app-owned data and return confirmation |
| `/api/assets/upload-url` | POST | `{checkId,kind,mime,size}` → short-lived signed upload target |

**Error envelope:**
```json
{ "error": { "code": "PHOTO_FEET_NOT_VISIBLE", "message": "We need to see your shoes for a shoe preview.", "retryable": true, "action": "RETAKE_PHOTO" } }
```

**Provider boundary:** Browser never sends provider file IDs, raw arbitrary URLs, or API credentials to the adapter. All provider task IDs stay server-side; UI sees local render job IDs.

## 14. Validation, failures and recovery

**File:** Unsupported type → ask convert/replace; too large → client resize within clarity constraints, else replace; corrupted/blank → replace. Never alter image identity via beautification.

**Invitation:** Parser couldn't read → direct manual form prefilled with any confirmed fields; low confidence → prompt confirmation; contradicting requirements → show them separately rather than silently resolving.

**Photo:** More than one person → reject for provider render; feet cropped → shoe path disabled with guidance; head obscured or non-front pose → warn and request retake; user says no consent → do not upload/process.

**Assessment:** Vision uncertain → ask targeted question, not guess; conflicting source details → user override; transient model timeout → retry extraction once safely without duplicate results.

**YouCam:** 401 invalid token → internal alert and friendly unavailable state; 429 → bounded retry honoring `Retry-After` if available; 400/image issues → user correction; 5xx/inference failure → offer explicit retry; no success after configured timeout → mark `delayed`, keep recoverable, reconcile later; expired signed URL → copy quickly or refetch task if provider supports it.

**Client:** Refresh during render → resume from DB; back button → no paid resubmission; duplicate tap → same job; offline → recoverable reconnect state; deleted session → no stale asset access.

**Output quality:** If image obviously changes identity/clothing beyond chosen category, offer `This preview looks inaccurate` feedback and never assert successful visual fidelity. Do not silently substitute another asset.

## 15. Privacy, consent, safety and accessibility

- Privacy-by-default. Original photos, invitations, and results in private storage; no public face-image URLs.
- Require explicit adult/permission consent before upload; do not accept other people's photos without permission.
- Clearly disclose third-party AI processing (YouCam and chosen vision provider), intended use, retention, and inability to guarantee deletion from processors beyond their policies.
- Suggested app retention: anonymous session assets automatically deleted after **24 hours** unless an active job is still running; signed-in saved looks after **30 days** by default with delete-now control. These are **WearCheck product policies**, not claims about provider storage/retention; configure and document actual enforcement.
- Share only with separate opt-in; time-limited links, revoke, `noindex`, no social discovery.
- Strip EXIF location on ingestion, avoid logging personal media/derived demographics, encrypt traffic, secure keys, apply upload and compute rate limits.
- Do not provide body/beauty grading, discriminatory style rules, or claims about religious/cultural compliance without direct event requirements. Avoid sensitive attribute inference.
- Accessible keyboard tab order, labelled upload controls, status text announced with `aria-live`, focus management across step transitions, descriptive image alt text, comparison toggle independent of slider, readable errors, and reduced-motion support.
- Small screens must keep CTA, reason, and key images visible without horizontal scrolling.

## 16. Analytics and success measurement

### 16.1 Event tracking
`check_started`, `invitation_added`, `requirements_confirmed`, `photo_accepted`, `assessment_completed`, `keep_outfit_selected`, `correction_selected`, `render_submitted`, `render_completed`, `render_failed`, `card_downloaded`, `card_shared`, `check_deleted`, `feedback_submitted`.

Track only timestamps, anonymised owner/session references, feature/category, coarse error classifications, model/provider version, and duration. No invitation text or images in analytics.

### 16.2 Metrics and proposed validation gates
- **Primary task success:** percentage of eligible checks reaching a decision card with no intervention needed or a completed meaningful preview.
- **Completion funnel:** start → requirements confirmed → photo accepted → assessment → final card.
- **Render reliability:** successes / submitted tasks, by provider/model/category; report misses.
- **Latency:** observed median and 90th percentile of provider task time and visible-to-user completion, measured on actual runs.
- **Decision usefulness:** in a small user test, count how many say the rationale is correct and actionable; record disagreements verbatim with permission.
- **No-change trust:** confirm system doesn't invent corrections in no-change tests.

Suggested internal acceptance targets (not proven market facts): ≥3 real curated journeys with no blocked step; ≥10 total live provider runs across both categories; report every failure; at least 5 consenting user reviews, with actual number and findings disclosed. Do not claim improvement versus competitors without comparative test.

## 17. Test plan and detailed acceptance scenarios

### 17.1 Unit
- Schema rejects unknown requirement severity / unsupported garment category.
- Rules engine never labels an inference `explicit invitation rule`.
- `keep_as_is` when no confirmed conflict and no material uncertainty; empty recommendations allowed.
- Requirement edits invalidate assessment revisions; stale records cannot be rendered as current.
- Idempotency maps identical concurrent clicks to one job.
- Output card includes source and disclaimer.
- Guest B cannot read guest A's check using guessed UUID.

### 17.2 API/provider integration
- Register one sample file and upload required bytes to YouCam.
- Submit Clothes V4 (dress/outer category); poll terminal result; persist private image.
- Submit Shoes V3; poll; persist; check correct V3 request fields.
- Invalid input, 401, 429, timeout, failed inference handled without infinite spinner.
- Provider temporary URL expiry is not exposed as a broken permanent saved result.
- Credit ledger counts submitted/failed/completed tasks consistently; compare with account console.

### 17.3 End-to-end
**E2E-01:** New guest → manual invitation → confirm → clear full-body photo → compatible assessment → decision card, no render.  
**E2E-02:** Garden wedding → stilettos → recommendation → real shoe task → compare → download.  
**E2E-03:** Explicit no-ivory → user confirms garment ivory → alternative dress → real Clothes V4 task → card.  
**E2E-04:** Ambiguous style text → follow-up clarification → no false mandatory verdict.  
**E2E-05:** Feet cropped → no shoe preview until retake.  
**E2E-06:** Refresh mid-render → status resumes without duplicate task.  
**E2E-07:** Provider fails → original remains visible and new retry requires user click.  
**E2E-08:** Delete → future GET to session and previous signed assets denied/expire.  
**E2E-09:** Mobile Safari/Chrome photo upload and before/after interaction.  
**E2E-10:** Desktop keyboard-only workflow and screen reader status updates.

### 17.4 Human QA
For each test scenario: compare invitation text, model extraction, user-confirmed rules, observation, finding, proposed replacement, rendered output and final card. Log wrong outputs with example screenshots (consented or redacted) and classify: extraction / reasoning / reference / generation / UI / latency.

## 18. Engineering implementation sequence and decision gates

**Gate 0 — Verify sponsor behaviour.** Confirm valid keys and quotas. Run Clothes V4 and Shoes V3 using clean, licensed or consenting photos; record 3+ samples each: submit acknowledgment, first visible result, completion, errors and actual units. Confirm V3 request schema and API result fields before coding the product UI around assumptions.

**Gate 1 — Vertical slice.** One fixed genuine event, one real photo, one actual approved reference: backend upload → model observations → grounded decision → YouCam render → persisted image → on-screen compare. This proves the dominant mechanism.

**Gate 2 — Full user journey.** Add all upload forms, manual/vision extraction, confirmation, state revisions, no-change verdict, suggestions, decision card, mobile/desktop layouts and privacy controls. Build all logically consistent features required by the locked mechanism, not just the easiest screens.

**Gate 3 — Reliability and evidence.** Provider job persistence, errors, idempotency, rate limiting, tests, logging, multiple real inputs, explicit failure cases; human-read generated decision card.

**Gate 4 — Judge path and film.** Three curated cases live-verified, stable `/demo`, README with run instructions and result screenshots/GIF, 1–3-minute film recorded from actual UI and clearly labelled. Repo and deployed app must match video.

**Gate 5 — Submission.** Validate public judge access at no charge through end of judging, repository licensing/access, complete source/assets/setup instructions, Devpost description, screenshots and public video. Retest critical endpoints after deployment.

Do not postpone a logically essential feature simply because the deadline is close. Cut only features that fail the product's anchored job or muddy the main mechanism. However, do not invent performance or suggest a provider operation works before it has been exercised.

## 19. Demo film: 9-beat script architecture

1. **Person (0:00–0:14):** Someone invited to an outdoor formal wedding has a dress and shoes they like.
2. **Problem (0:14–0:29):** Invitation says flats or wedges; they don't know whether their outfit works.
3. **Gap (0:29–0:40):** Generic style suggestions start from shopping, not their existing outfit and actual invitation.
4. **Turn (0:40–0:47):** `WearCheck. Keep what works. Preview what doesn't.`
5. **Mechanism (0:47–1:00):** Upload invitation + photo; confirm actual requirement.
6. **Live proof (1:00–1:35):** Show real extraction, grounded shoe recommendation, selected licensed reference, actual YouCam task and generated result.
7. **Range (1:35–2:06):** Compare before/after; show downloadable decision card; show a second scenario where it recommends no change.
8. **Why YouCam (2:06–2:20):** One clean sentence on Clothes V4 / Shoes V3 being responsible for preview; report measured real runs and misses.
9. **Payoff (2:20–2:30):** Person confidently decides what to wear; URL and honest caveat `Visual preview, not physical fit guarantee`.

Record actual product footage, show causality, disclose any sped-up provider waiting and separate previously generated images from new live runs. Film and submission claims must match implemented functionality.

## 20. Judge readiness and final definition of done

**Engineering DONE** only if:
- All P0 routes run without broken navigation on mobile and desktop.
- Both selected YouCam APIs have a successful *recorded real* end-to-end call (if either fails, adjust claims/scope rather than simulating it).
- Exact invitation text → confirmed constraints → explained finding → visual correction works.
- `Keep what you have` succeeds without forced purchase or render.
- No viewer can access another's images or checks.
- Completed outputs survive provider signed-URL expiry while inside app retention.
- Error and recoverable retry states work; no API key in client.
- Decision card downloads and is readable at phone size.
- All three demo cases live-verified; failed runs are counted and disclosed.
- Repo setup and deployment documented; screenshots/video reflect real build.

**Product DONE** only if a first-time evaluator can explain in one sentence *what problem the app solves* after ten seconds and, after viewing one complete journey, can identify exactly what YouCam generated.

**Claim discipline:** no unmeasured accuracy or cost-saving claims; no fake SKU/stock price; no unlicensed photos; no claims that subjective event etiquette is certain.

## 21. Risks, triggers and mitigation

| Risk | Impact | Mitigation / trigger |
|---|---|---|
| Too similar to generic AI stylist | Weak originality | Preserve real-invitation anchoring, minimal one-item edit, actual user artifact. If judges see it as generic outfit rating, revise concept/pitch. |
| Vision guesses colour/formality | Harmful recommendations | User confirms hard restrictions and ambiguous photo attributes; clear source tags. |
| Clothing/sneaker VTO output changes identity or unrelated clothing | Loss of trust | Label generated preview, enable report, don't claim exact preservation; QA both APIs. |
| Shoe image feet not visible | Render fails | Preflight foot visibility, retake guidance, written fallback. |
| API quota runs out due to judge traffic | Broken demo | Budget log, per-session rate limits, monitor usage, maintain free judge availability. |
| Temporary provider result URL expires | Broken saved card | Persist output privately immediately. |
| Mixed garment + shoes loses accuracy | Misleading result | Treat as separate previews unless sequential chain passes QA. |
| User privacy or missing image permission | High severity | Explicit consent, private buckets, delete workflow, licensed demo assets. |
| Scripted results mistaken for live | Credibility failure | Distinguish example snapshot versus real run; record task ID/timestamps privately. |

**Kill/revise trigger:** If real users and test samples show that confirmed dress-code requirements cannot generate a useful one-item correction, or if YouCam cannot generate an acceptably attributable preview on supported input, revise the product mechanism rather than padding it with generic recommendations.

## 22. Open decisions and documented assumptions

Decisions already set: guest-first; no paywall; mobile-first; user confirmation; minimal-edit priority; two selected YouCam APIs; permissioned demo references; private storage; optional accounts.

Must resolve by running tests, without requiring another product-planning conversation:
1. Choose structured-vision provider/model and pin version based on observed accuracy and response time on invitation images.
2. Confirm current YouCam account key, 1,000-unit redemption, task quota and actual request requirements.
3. Confirm the V3 Shoes OpenAPI optional parameters rather than adopting older V2 examples.
4. Finalise licensed catalogue assets and permissioned images for all three demos.
5. Confirm return-from-background render behaviour and output-copy job reconciliation.
6. Record whether full-body/shoe render compositions remain consistent; enable chained preview only if proven.
7. Implement real privacy retention and name the selected periods in UI; do not claim provider-side deletion guarantees.

## 23. Primary external references

- Hackathon rules and equally weighted rubric: https://youcam-api-skin-ai-ecommerce.devpost.com/rules
- Clothes V4 endpoint: https://docs.perfectcorp.com/reference/ai_clothes/v4.0/paths/~1s2s~1v2.0~1task~1cloth-v4/post
- Clothes integration, upload, polling, specs: https://docs.perfectcorp.com/reference/ai_clothes/section/overview
- Clothes V4 outerwear, per-category processing and 2 units: https://www.perfectcorp.com/business/blog/ai-clothes/ai-clothes-try-on-api-v4-outerwear
- Shoes V3 endpoint: https://docs.perfectcorp.com/reference/ai_shoes/v3.0
- Shoes upload, polling, photo requirements and 2 units: https://docs.perfectcorp.com/reference/ai_shoes/section/overview/integration-guide
- Provider changelog: https://docs.perfectcorp.com/release/changelog

---

**Implementation instruction:** Build the product described here, not a generic fashion chatbot. Real invitation + original outfit + smallest justified change + real YouCam visual preview + useful decision card is the non-negotiable throughline. Where external services are unverified, test and record behaviour rather than quietly substituting mock responses.
