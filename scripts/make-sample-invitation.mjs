// Generates a SAMPLE invitation image for testing the upload/extraction path.
// It is created by the project, not a real invitation, and is labelled as such in the image.
//   node scripts/make-sample-invitation.mjs [out.png]
import sharp from "sharp";

const out = process.argv[2] ?? "tests/fixtures/sample-invitation.png";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <rect width="1200" height="1600" fill="#fbf7ef"/>
  <rect x="60" y="60" width="1080" height="1480" fill="none" stroke="#7a5c3e" stroke-width="3"/>
  <text x="600" y="110" text-anchor="middle" font-family="Arial" font-size="22" fill="#9a8f80">SAMPLE INVITATION — CREATED FOR TESTING, NOT A REAL EVENT</text>
  <text x="600" y="330" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#3b3229" letter-spacing="6">TOGETHER WITH THEIR FAMILIES</text>
  <text x="600" y="470" text-anchor="middle" font-family="Georgia, serif" font-size="110" fill="#1e1d1b">Ana &amp; Joe</text>
  <text x="600" y="560" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="#3b3229">request the pleasure of your company</text>
  <text x="600" y="700" text-anchor="middle" font-family="Georgia, serif" font-size="46" fill="#1e1d1b">Saturday 12 December 2026 · 3 pm</text>
  <text x="600" y="770" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="#3b3229">Garden ceremony on the lawn, Hollis House</text>
  <line x1="420" y1="860" x2="780" y2="860" stroke="#7a5c3e" stroke-width="2"/>
  <text x="600" y="960" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#1e1d1b">Dress code: Formal</text>
  <text x="600" y="1040" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="#3b3229">Flats or wedges recommended</text>
  <text x="600" y="1100" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="#3b3229">Please avoid white or ivory</text>
  <text x="600" y="1300" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#6b665e">Kindly reply by 1 November</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(out);
console.log("wrote", out);
