# WearCheck — two-minute demo: script and shot list

**Status:** recorded and edited, **not uploaded**. File: `private-ops/video/wearcheck-demo-120s.mp4`, exactly 120.00 s, 1280×720, H.264 + AAC, with burned-in captions and a synthesised voiceover. It was recorded from https://wearcheck.vercel.app on 2026-11-01 with `scripts/demo-record.mjs` and cut with `scripts/demo-edit.mjs`. The edit enforces the 120-second total and writes its cut list next to the video.

Always on screen: "Recorded on wearcheck.vercel.app · 1 Nov 2026".

| # | Final time | Shot (real app) | Voiceover = caption | On-screen disclosure |
|---|---|---|---|---|
| 1 | 0:00–0:09 | Landing hero | "You have the invitation. The outfit is already in your wardrobe. Does it work for this event?" | — |
| 2 | 0:09–0:20 | How-it-works story, stepping through the panels | "WearCheck starts with what the invitation says, then looks at the outfit you already own." | — |
| 3 | 0:20–0:41 | Upload the sample invitation → Gemini reads it → requirements with "From invitation" quotes | "Upload the invitation. Gemini reads it, and each requirement is quoted word for word, for you to confirm. Nothing is judged until you do." | "Sample invitation created for this demo, not a real event." · "Gemini reading sped up ×1.2 (actual 8.2 s)" |
| 4 | 0:41–0:53 | Outfit step: CC0 photo, consent ticked | "Then add one full-length photo, with consent." | "Photo: Brooke Cagle / Unsplash (CC0). The person shown has not reviewed this AI preview." |
| 5 | 0:53–1:11 | Findings: "Your shoes appear to be boots", "Why?" opened showing the quoted rule | "Each finding names the rule behind it. Here, boots don't match the request for flats or wedges on a lawn." | "Gemini reading sped up ×2.3 (actual 7.0 s)" |
| 6 | 1:11–1:21 | Options: tan oxford selected, "Visual reference — not a live shopping listing" | "Choose one alternative. It's a visual reference, not a shopping listing." | — |
| 7 | 1:21–1:40 | Real Shoes V3 render → comparison slider dragged | "YouCam renders it onto the photo, live. It shows the idea of the change, not fit, size or comfort." | "Real YouCam Shoes V3 render on the live site." · "YouCam render sped up ×3.5 (actual 18.2 s)" |
| 8 | 1:40–1:52 | Decision page and decision card | "You decide, and download a decision card. Keeping your outfit is a complete answer too." | — |
| 9 | 1:52–2:00 | Landing page | "WearCheck. An outfit you own. An occasion to get right." | — |

**To re-record with a different, fully consented photo:** run `node scripts/demo-record.mjs https://wearcheck.vercel.app <photo>`, then `node scripts/demo-edit.mjs private-ops/video/raw-<stamp>.webm <ffmpeg.exe>`. Update the caption text in `scripts/demo-edit.mjs` if the findings differ. Each recording uses one real render (2 units).
