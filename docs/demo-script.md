# WearCheck — two-minute demo script and shot list

Target length: **exactly 120 seconds**. Record from the deployed app (https://wearcheck.vercel.app), not localhost. Burn in captions that match the voiceover.

**Before recording**
- A real YouCam render must exist from a photo whose subject has given **public-use** permission. Without one, cut shot 7 and do not show or imply a preview.
- If you speed up waiting time (Gemini reading, YouCam rendering), show an on-screen label, e.g. "Sped up ×4 — real render took 38 s", using the latency recorded in `private-ops/youcam-runs.jsonl`.
- Don't show the address bar on check URLs, any API keys or the Vercel or Supabase dashboards.

| # | Time | Shot | Voiceover / caption |
|---|---|---|---|
| 1 | 0:00–0:10 | Landing hero, slow push-in on the photo and notes | "You've got the invitation, and the outfit's already in your wardrobe. Does it actually work for this event?" |
| 2 | 0:10–0:22 | Scroll through the how-it-works story; panels move sideways | "WearCheck starts with what the invitation says, then looks at the outfit you already own." |
| 3 | 0:22–0:38 | New check → upload the sample invitation (labelled as a sample) → requirements list with "From invitation" quotes | "It quotes the exact wording — 'flats or wedges recommended', 'please avoid white or ivory' — and you confirm every requirement." |
| 4 | 0:38–0:52 | Outfit step: permissioned photo, consent box ticked, Continue | "One photo, with consent. It says plainly what it can and can't see." |
| 5 | 0:52–1:10 | Findings: status, key finding, "Why?" opened to show the quoted rule | "Each finding names the rule behind it. If the photo can't answer a requirement, it asks you instead of guessing." |
| 6 | 1:10–1:22 | Options: one reference item, labelled "Visual reference — not a live shopping listing" | "If one item conflicts, you pick a single alternative. It's a reference, not something to buy." |
| 7 | 1:22–1:42 | Preview: real YouCam render; drag the comparison slider; caption with recorded latency | "YouCam renders it onto your own photo. It shows the idea of the change — not fit, size or comfort." |
| 8 | 1:42–1:54 | Decision page and card download | "You decide. Keeping your outfit is a complete answer, and you get a card either way." |
| 9 | 1:54–2:00 | Logo and URL | "WearCheck. An outfit you own. An occasion to get right." |

**Fallback cut with no permitted render (still 120 s):** replace shot 7 with the compatible example. Show its findings, then *Save my outfit check*, then the decision card. Narration for shot 6: "When nothing conflicts, that's the result — no preview, nothing to buy." Don't mention YouCam output.

**Status:** script and shot list only. **No video has been recorded.** Recording it needs (a) a permitted real render and (b) a screen recorder plus a voiceover recording, neither of which is available in this environment. Nothing has been uploaded anywhere.
