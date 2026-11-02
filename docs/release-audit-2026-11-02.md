# Release repair audit — 2 November 2026

Baseline: local and remote implementation branch `92f3a9b950aeff8ccd9bf929b6abbdd74f455c92`; production application header `f1b68730e778740672f70141e304cf70d781bf09`. The difference is documentation. `main` remains separate. Existing changes to the three demo scripts are outside this repair. No video work is authorised in this phase.

## Findings before repair

| ID | Severity | Route / reproduction | Root cause | Required repair and evidence |
|---|---|---|---|---|
| A01 | High | Choose a shirt, generate, then try another item | Only one upper-body catalogue image; options ignore prior render references | Real distinct licensed inventory; persistent exclusion of attempted references; duplicate-image exclusion; tests through provider submission |
| A02 | High | Resolve one colour issue while another requirement remains violated | Preview outcome only examines the targeted finding | Reassess every confirmed requirement; expose remaining issues and uncertainty in preview and decision |
| A03 | High | Upload a reference that violates an exclusion or is in the wrong category | Category is supplied by the client; image suitability is never checked | Inspect uploaded reference before admitting it, reject conflicts and withhold uncertain inputs; revalidate against current requirements |
| A04 | Medium | Start checks until quota is reached | Native form navigates to a JSON error; shared IP quota; no reset metadata | Recoverable start UI, accurate cooldown and HTTP headers, scoped admission and duplicate handling |
| A05 | Medium | Browse alternatives with requested colours or sleeve exclusions | Requested colour affects score only; sleeve matching ignores polarity | Enforce applicable constraints before ranking; conservative interpretation tests |
| A06 | Medium | Landing story proof | Editorial mock assessment is disclosed but does not demonstrate runtime | Use existing genuinely generated public evidence with its limitations and verified attribution |
| A07 | High | Edit a free-text requirement while retaining its rule ID | Observation cache compared IDs rather than the wording/revision; old user answers could also carry forward | Bind observations and answers to the confirmed revision; require fresh readings for older/changed evidence |

Direct production GET `/api/checks` returned **405**, not `RATE_LIMITED`. Only POST creates a check and consumes that quota. This observation does not invalidate a prior POST quota failure.

This is an initial audit, not a completion certificate. Hosted repair evidence, release SHA, exact checks, provider spending and remaining limitations must be recorded after implementation and verification.

## Repairs implemented

- A01: two genuinely different shirt photographs; exact SHA-256 and perceptual difference hashes; attempted references excluded by the current assessment; rejected choices and selection retained in the browser; empty/one-item states; the preview's alternate link retains category and finding. Same named garment/colour and same shoe style/colour are withheld as current-look similarities. This attribute comparison is conservative, not visual identity recognition.
- A02: every generated outfit is assessed against all confirmed requirements. Any remaining conflict or unchecked requirement prevents a resolved result. Optional previews participate too. The preview and decision expose the full check list; saving a change requires a completed recheck, while the user may deliberately save an unresolved choice with that status retained.
- A03: uploaded references receive schema-validated Gemini readings before storage/admission. Wrong category, ambiguous images, conflicting colours/styles and unsupported custom suitability are withheld. Server admission checks the stored validation and its current requirements revision. A successful reference reading does not certify the generated outfit.
- A04: creation is atomic and idempotent per guest/request. Creation and paid-render quotas use the guest session; the network backstop applies only to starting a new browser session. Existing sessions on a shared network do not spend one another's check quota. Sliding-window failures expose actual `Retry-After`/reset values, a recoverable inline error and countdown. Native form failures return to a readable page. Idempotent render replays do not consume a new render allowance.
- A05: requested colours, known formality tags and sleeve polarity are applied before ranking. Unknown suitability is withheld. The green-and-white striped shirt remains ineligible under a white exclusion. Black/white tie cannot be certified from the small catalogue.
- A06: the landing retains its scroll narrative but replaces the mock finding/card with recorded real Clothes V4 and Shoes V3 outputs. The clothing example explicitly retains white underneath and is unresolved. Source-specific Commons metadata was checked for all 17 editorial/reference records: zero licence mismatches. Unsplash is not assumed to be CC0 generally; the specific public source predates its licence change, as documented on its Commons page.
- A07: model observations and user rule answers are bound to requirements revisions; historical assessments require a fresh reading under the release policy version. Admission rechecks current photo/revision under a row lock before any paid submission.

Exact source/reference byte hashes, provider file IDs, category and feature are persisted privately before task creation. Operational tests can trace the selected reference to the actual submitted files without exposing credentials or provider identifiers in the UI. Storage fetches have a 20-second deadline. Controlled storage failures test access revocation, cleanup retry and compensation for a save racing deletion.

## Verification boundary

Local unit suite: 111 passed. Controlled database/provider/storage suite: 15 passed, with mocked providers and storage and no paid generation. Production build and lint passed. The browser suite and hosted provider release evidence remain release gates, not inferred successes.

The shared-database snapshots agree in 11 of 13 sections. During this work, Storage gained `enforce_versioning_status_transition` and its bucket trigger; Storage's recorded migration list includes `unlock-object-versioning`. The WearCheck migration runner applied only additive statements in `wearcheck`. No unrelated function, trigger, policy or schema was edited or reverted by this repair. The platform difference is preserved in private before/after evidence rather than concealed.

Product claims and a clearly future retail-feed design are documented in [product-direction.md](product-direction.md). No retail availability or user-impact metrics are claimed. No video work is part of this release phase.
