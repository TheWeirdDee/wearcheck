# WearCheck — final three-minute demo

Recorded from https://wearcheck.vercel.app on 2 November 2026, application commit `f1b68730e778740672f70141e304cf70d781bf09`. The video is private and local; it has not been publicly uploaded or submitted to Devpost.

Final file: `private-ops/video/wearcheck-demo-180s.mp4` (git-ignored). Exactly 180.000 seconds, 1920×1080, 30 fps, H.264/AAC, burned-in captions and synthesised Windows SAPI narration. It replaces the previous demo.

The owner explicitly authorised the photo and generated previews for this demo. No private photograph or recording is included in Git. The invitation is a labelled sample. References are licensed example images, not stock or personalised shopping recommendations.

| Time | Real recorded behavior |
|---|---|
| 0:00–0:10 | Concrete problem: a white shirt and a no-white invitation; original/preview comparison |
| 0:10–0:32 | Invitation upload, Gemini extraction, quoted requirements, confirmation |
| 0:32–0:54 | Full-length photo and consent, white-shirt finding, exact rule and checked breakdown |
| 0:54–1:42 | Blue-shirt reference and reasons, large original/reference review, Clothes V4 generation, full-photo comparison, close-up and explicit preview recheck |
| 1:42–2:12 | Footwear finding, user-reference upload of licensed oxford shoes, Shoes V3 generation, full-photo comparison and shoe close-up |
| 2:12–2:32 | Choose clothing preview, decision, download and open the actual decision-card PNG |
| 2:32–2:47 | Different event requirements on the same check: formal/no trainers/avoid red; checked compatible result, keep original without rendering |
| 2:47–3:00 | Mobile comparison, changed-area zoom, limitations and URL |

Gemini extracts information; WearCheck evaluates confirmed requirements and selects eligible references; YouCam generates the try-on. Clothes V4 redraws clothing from a reference; Shoes V3 redraws footwear. Generation alone does not establish that a rule was resolved.

The clothing output replaces the white shirt, vest and tie with a blue shirt. Visual inspection found no remaining white garment; the separate AI recheck reported that the requirement appeared met. Other layers changed too, a disclosed limitation. The shoe output replaces black shoes with tan oxfords as a separate operation on the original photo, not a combined clothing-and-shoes result. Uploaded references are not automatically verified for category or suitability.

Only provider waits are sped up, with actual elapsed waits and speed factors disclosed. Other edits are labelled cuts between real moments. Generation times were 19 seconds for clothing and 39 seconds for shoes; displayed wait measurements also include upload/submission overhead.

The complete export played at normal speed through its 180-second end. Ninety frames spanning the playback, full-size shirt/shoe close-ups and captions were inspected. FFmpeg and Chromium both decoded all 5,400 frames; audio decoded successfully and peaked at −5.7 dB without clipping.

File size: 21,176,551 bytes. SHA-256: `116337913a74f7c7945a167baee38e79f41cca862e8aa098825aa8386bf093ca`.

Private evidence: `private-ops/final-video/`. Finding-by-finding report: `private-ops/final-verification.md`. Total provider use for this pass was five generations / ten units, including one generation before a private recording-helper failure. The helper was corrected and the cap was respected. The final demo check was deleted through the app.

The three pre-existing uncommitted demo-script edits were preserved. Private copies supplied the final recording and timed narration; private operational files remain outside Git.
