import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { type CheckRow, saveAsset, setStep } from "./checks";
import { db } from "./db";
import { log } from "./log";
import type { ManualDetails } from "./schemas";
import { getObject } from "./storage";

/**
 * The three PRD judge scenarios. Requirements are entered directly for the example (labelled as such,
 * not presented as an invitation). Photos are permissioned adult images stored privately under
 * `demo/<slug>.jpg` in the WearCheck bucket by `scripts/upload-demo-assets.mjs`; if a photo hasn't been
 * provided, the demo still runs the real workflow and asks for the user's own photo.
 * "Run this example" executes the live pipeline (vision model + rules + YouCam); nothing is replayed.
 */
export type DemoCase = {
  slug: string;
  title: string;
  challenge: string;
  expected: string;
  details: ManualDetails;
};

export const DEMO_CASES: DemoCase[] = [
  {
    slug: "garden-wedding-shoes",
    title: "Outdoor garden wedding",
    challenge: "Formal ceremony on the lawn — the host recommends flats or wedges.",
    expected: "If narrow heels are visible, WearCheck suggests a shoe change and offers a live Shoes V3 preview.",
    details: {
      event_name: "Garden wedding (example)",
      event_type: "wedding",
      dress_code: "Formal",
      setting: "outdoor",
      restrictions: "Ceremony on the lawn — flats or wedges recommended",
      event_date: "",
    },
  },
  {
    slug: "no-white-ivory",
    title: "Wedding with a colour rule",
    challenge: "The couple asks guests to avoid white or ivory.",
    expected: "If the outfit looks pale, WearCheck asks you to confirm the shade before calling a conflict, then offers a live Clothes V4 preview.",
    details: {
      event_name: "Evening wedding (example)",
      event_type: "wedding",
      dress_code: "Cocktail",
      setting: "indoor",
      restrictions: "Please avoid white or ivory",
      event_date: "",
    },
  },
  {
    slug: "compatible-keep",
    title: "Work dinner, nothing to fix",
    challenge: "Smart-casual dinner with no stated restrictions.",
    expected: "If nothing conflicts, WearCheck says so and finishes without any AI render.",
    details: {
      event_name: "Team dinner (example)",
      event_type: "work",
      dress_code: "Smart casual",
      setting: "indoor",
      restrictions: "",
      event_date: "",
    },
  },
];

export const demoPhotoKey = (slug: string) => `demo/${slug}.jpg`;

export async function demoPhotoAvailable(slug: string) {
  try {
    await getObject(demoPhotoKey(slug));
    return true;
  } catch {
    return false;
  }
}

export async function startDemoCheck(check: CheckRow, slug: string): Promise<string> {
  const demo = DEMO_CASES.find((d) => d.slug === slug)!;
  await db()`insert into wearcheck.event_sources (check_id, source_type, manual_json) values (${check.id}, 'demo_manual', ${db().json(demo.details as never)})`;
  try {
    const bytes = await getObject(demoPhotoKey(slug));
    const meta = await sharp(bytes).metadata();
    const [consent] = await db()`
      insert into wearcheck.consent_records (check_id, statement_version, source)
      values (${check.id}, 'demo-permission-v1', 'demo_case_documented_permission') returning id`;
    const asset = await saveAsset(check.id, "outfit", { bytes, width: meta.width!, height: meta.height!, sha256: createHash("sha256").update(bytes).digest("hex"), mime: "image/jpeg" }, `demo:${slug}`, consent.id as string);
    await db()`update wearcheck.checks set photo_asset_id = ${asset.id} where id = ${check.id}`;
  } catch {
    log.info("demo_photo_missing", { slug });
  }
  await setStep(check.id, "requirements");
  return `/check/${check.id}/requirements`;
}
