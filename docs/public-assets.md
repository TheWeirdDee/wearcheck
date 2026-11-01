# Public assets and permissions

What may appear publicly (site, README, screenshots, demo video), and on what basis.

## Never public
- **The project owner's own photos and every render made from them.** Permission covers private testing only. They are stored in git-ignored `private-assets/` and `private-ops/`, or in WearCheck's private bucket until retention cleanup removes them.

## Public, with the basis for each

| Asset | Source | Licence / permission | Processing | Notes |
|---|---|---|---|---|
| `public/editorial/*.jpg` | Unsplash originals mirrored on Wikimedia Commons | CC0 1.0 | Cropped and colour graded (`scripts/build-editorial.mjs`); two help-page variants are cropped or darkened | Illustration only. Labelled on the page and never presented as an assessment or a render |
| `public/showcase/brick-wall-original.jpg` | "Man in front of brick wall (Unsplash).jpg", Brooke Cagle | CC0 1.0: public-domain dedication; permits copying, modification and publication | Cropped to 4:5, resized | Source photo for the public demo renders |
| `public/showcase/brick-wall-preview-loafers.jpg` | Real YouCam **Shoes V3** output from the photo above, generated through the WearCheck UI on https://wearcheck.vercel.app, completed 2026-11-01 09:31:54Z (17 s, 2 units) | A derivative of a CC0 photo | Resized | Reference item: black tassel loafer, CC BY-SA 4.0 (Samansmaee) |
| `public/showcase/brick-wall-preview-shirt.jpg` | Real YouCam **Clothes V4** output, same route, completed 2026-11-01 09:30:56Z (18 s, 2 units) | A derivative of a CC0 photo | Resized | Reference item: blue button-down shirt, CC BY-SA 3.0 (ChristianGlaeser). The white T-shirt underneath remains visible |
| `public/reference/*.jpg` | Wikimedia Commons | CC BY 2.0, CC BY 4.0, CC BY-SA 3.0 and CC BY-SA 4.0, each credited in the app | Trimmed, padded and resized (`scripts/build-references.mjs`) | "Visual reference — not a live shopping listing". Modified BY-SA files are shared under the same licence |

## Remaining gap (for the owner to judge before submitting)
CC0 settles **copyright**: the photographer waived it, so modifying and publishing the photo is permitted. It does **not** provide a **model release**. The man in the photo hasn't consented to, or reviewed, an AI-altered image of himself. The showcase and the demo video say so on screen.

If that isn't acceptable for the submission, the precise missing input is a full-length photo of an adult who gives written consent to (a) AI try-on processing and (b) publication of the original and the renders. Replace the three `public/showcase` files and update `lib/showcase.ts`. Nothing else changes.
