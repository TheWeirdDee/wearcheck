// Read-only verification of source-specific Commons licences, not a blanket Unsplash assumption.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const records = ["editorial", "reference"].flatMap((directory) => Object.values(JSON.parse(readFileSync(`public/${directory}/LICENSES.json`, "utf8"))).map((r) => ({ directory, ...r })));
const titles = [...new Set(records.map((r) => r.title))];
const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist|UsageTerms&titles=" + encodeURIComponent(titles.join("|"));
const response = await fetch(url, { headers: { "User-Agent": "WearCheckLicenceAudit/1.0" } });
if (!response.ok) throw new Error(`Commons metadata HTTP ${response.status}`);
const pages = Object.values((await response.json()).query.pages);
const evidence = records.map((r) => {
  const page = pages.find((p) => p.title === r.title);
  const info = page?.imageinfo?.[0];
  const actual = info?.extmetadata?.LicenseShortName?.value;
  return { file: `${r.directory}/${r.file ?? r.title}`, source: r.page, declared: r.license, actual, matches: r.license === actual, licenceUrl: info?.extmetadata?.LicenseUrl?.value };
});
mkdirSync("private-ops", { recursive: true });
writeFileSync("private-ops/release-licence-audit.json", JSON.stringify({ checkedAt: new Date().toISOString(), evidence }, null, 2));
console.log(`${evidence.length} metadata records checked; ${evidence.filter((r) => !r.matches).length} mismatches.`);
for (const e of evidence.filter((r) => !r.matches)) console.log(JSON.stringify(e));
if (evidence.some((r) => !r.matches)) process.exitCode = 1;
