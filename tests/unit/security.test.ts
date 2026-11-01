import { describe, expect, it } from "vitest";
import { redact } from "@/lib/log";
import { describeEngineError, isAllowedProviderUrl } from "@/lib/youcam/client";
import { optionsFor } from "@/lib/catalogue";
import { fromManual } from "@/lib/requirements";
import type { Finding } from "@/lib/schemas";

describe("provider URL allowlist (SSRF guard)", () => {
  it.each([
    ["https://yce-us.s3-accelerate.amazonaws.com/demo/ttl30/x.jpg?sig=1", true],
    ["https://yce-api-01.makeupar.com/s2s/v2.0/file", true],
    ["http://yce-us.s3-accelerate.amazonaws.com/x.jpg", false],
    ["https://169.254.169.254/latest/meta-data", false],
    ["https://localhost/x", false],
    ["https://evil.example.com/amazonaws.com", false],
    ["https://amazonaws.com.evil.example/x", false],
    ["https://user:pass@yce-us.s3.amazonaws.com/x", false],
    ["https://yce-us.s3.amazonaws.com:8443/x", false],
    ["file:///etc/passwd", false],
    ["not a url", false],
  ])("%s → %s", (url, ok) => {
    expect(isAllowedProviderUrl(url)).toBe(ok);
  });
});

describe("log redaction", () => {
  it("strips URLs, bearer tokens, JWTs and connection strings", () => {
    const s = redact("fetch https://x.s3.amazonaws.com/a?X-Amz-Signature=abc Bearer sk_live_123 eyJhbGciOi.eyJzdWIi.c2ln postgresql://u:p@h:5432/db");
    expect(s).not.toMatch(/amazonaws|sk_live|eyJ|postgresql/);
  });
});

describe("engine error mapping", () => {
  it("maps photo problems to retake and reference problems to another item", () => {
    expect(describeEngineError("error_pose").action).toBe("RETAKE_PHOTO");
    expect(describeEngineError("error_multi_person").userCode).toBe("PHOTO_UNUSABLE");
    expect(describeEngineError("error_invalid_ref").action).toBe("CHOOSE_ANOTHER_ITEM");
    expect(describeEngineError("something_new").action).toBe("RETRY");
  });
});

describe("catalogue matching", () => {
  const finding = (cat: Finding["render_category"]): Finding => ({ id: "f1", rule_id: null, area: "clothing", kind: "explicit_rule", status: "conflict", observation: "", reason: "", evidence_text: null, evidence_source: "user", uncertainty: null, user_action: "preview_garment", render_category: cat, rank: 1 });

  it("never offers an item in an excluded colour", () => {
    const rq = fromManual({ event_name: "", event_type: "wedding", dress_code: "", setting: "indoor", restrictions: "No black or navy", event_date: "" });
    const items = optionsFor(finding("full_body"), rq);
    expect(items.every((i) => !i.colours.some((c) => c === "black" || c === "navy"))).toBe(true);
    // The remaining full-body references are black and navy, so nothing may be offered; the UI then offers "try your own item".
    expect(items).toEqual([]);
    const pale = fromManual({ event_name: "", event_type: "wedding", dress_code: "", setting: "indoor", restrictions: "Please avoid white or ivory", event_date: "" });
    const ok = optionsFor(finding("full_body"), pale);
    expect(ok.length).toBeGreaterThan(0);
    expect(ok.every((i) => !i.colours.some((c) => c === "white" || c === "ivory_cream"))).toBe(true);
  });

  it("only offers footwear that satisfies the footwear rule", () => {
    const rq = fromManual({ event_name: "", event_type: "wedding", dress_code: "", setting: "outdoor", restrictions: "Flats or wedges recommended", event_date: "" });
    const items = optionsFor(finding("shoes"), rq);
    expect(items.map((i) => i.footwear_style)).toEqual(["wedge"]);
  });

  it("every catalogue item is non-purchasable with a documented licence", async () => {
    const { CATALOGUE } = await import("@/lib/catalogue");
    for (const c of CATALOGUE) {
      expect(c.is_purchasable).toBe(false);
      expect(c.sku).toBeNull();
      expect(c.licence).toMatch(/CC/);
      expect(c.source_url).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });
});

describe("render job request", () => {
  it("accepts optional previews for every category, including the longest id", async () => {
    const { RenderJobRequest, RenderCategory } = await import("@/lib/schemas");
    for (const c of RenderCategory.options) {
      expect(RenderJobRequest.safeParse({ checkId: "6f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f", findingId: `voluntary:${c}`, itemId: "x" }).success).toBe(true);
    }
  });
});
