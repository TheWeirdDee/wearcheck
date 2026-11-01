import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Deterministic tests of Gemini failure handling. The Google client is replaced by a scripted fake,
 * so no live quota is used: each model name maps to the sequence of outcomes it returns.
 */
const script: Record<string, ("ok" | 429 | 503 | 400)[]> = {};
const calls: string[] = [];
let fallbackModel: string | undefined;

vi.mock("@google/genai", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  class GoogleGenAI {
    models = {
      generateContent: async ({ model }: { model: string }) => {
        calls.push(model);
        const next = script[model]?.shift() ?? "ok";
        if (next === "ok") {
          return { text: JSON.stringify({ readable: true, full_text: "Dress code: Formal", event_name: null, event_type: null, event_date: null, dress_code_text: "Formal", dress_code_is_ambiguous: false, venue_setting: "unknown", venue_surface: "unknown", venue_evidence_text: null, rules: [], suggestions: [], uncertainties: [] }) };
        }
        throw new ApiError(next, next === 429 ? "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: test" : "error");
      },
    };
  }
  return { ApiError, GoogleGenAI };
});

vi.mock("@/lib/env", () => ({
  env: () => ({ GEMINI_API_KEY: "test-key-not-real", GEMINI_MODEL: "primary-model", GEMINI_FALLBACK_MODEL: fallbackModel }),
}));

const image = Buffer.from([0xff, 0xd8, 0xff]);

beforeEach(() => {
  for (const k of Object.keys(script)) delete script[k];
  calls.length = 0;
  fallbackModel = "fallback-model";
  vi.useRealTimers();
});

describe("Gemini fallback and failure handling", () => {
  it("uses the primary model and reports it when nothing fails", async () => {
    const { extractInvitation } = await import("@/lib/ai/gemini");
    const r = await extractInvitation(image);
    expect(r.model).toBe("primary-model");
    expect(calls).toEqual(["primary-model"]);
  });

  it("falls back once on a primary quota error and records the fallback as the serving model", async () => {
    script["primary-model"] = [429];
    const { extractInvitation } = await import("@/lib/ai/gemini");
    const r = await extractInvitation(image);
    expect(r.model).toBe("fallback-model");
    expect(calls).toEqual(["primary-model", "fallback-model"]);
  });

  it("reports the free quota as used up when both models are limited (shared exhaustion)", async () => {
    script["primary-model"] = [429];
    script["fallback-model"] = [429];
    const { extractInvitation } = await import("@/lib/ai/gemini");
    await expect(extractInvitation(image)).rejects.toMatchObject({ code: "VISION_QUOTA", action: "ENTER_MANUALLY" });
    expect(calls).toEqual(["primary-model", "fallback-model"]);
  });

  it("does not try a fallback when none is configured", async () => {
    fallbackModel = undefined;
    script["primary-model"] = [429];
    const { extractInvitation } = await import("@/lib/ai/gemini");
    await expect(extractInvitation(image)).rejects.toMatchObject({ code: "VISION_QUOTA" });
    expect(calls).toEqual(["primary-model"]);
  });

  it("retries a high-demand 503 once on the same model before moving on", async () => {
    script["primary-model"] = [503, "ok"];
    const { extractInvitation } = await import("@/lib/ai/gemini");
    const r = await extractInvitation(image);
    expect(r.model).toBe("primary-model");
    expect(calls).toEqual(["primary-model", "primary-model"]);
  });

  it("says the service is busy, not out of quota, when demand errors persist on both models", async () => {
    script["primary-model"] = [503, 503];
    script["fallback-model"] = [503, 503];
    const { extractInvitation } = await import("@/lib/ai/gemini");
    await expect(extractInvitation(image)).rejects.toMatchObject({ code: "VISION_BUSY", action: "RETRY" });
    expect(calls).toHaveLength(4);
  });

  it("treats a configuration error as final with no retries or fallback", async () => {
    script["primary-model"] = [400];
    const { extractInvitation } = await import("@/lib/ai/gemini");
    await expect(extractInvitation(image)).rejects.toMatchObject({ code: "VISION_UNAVAILABLE" });
    expect(calls).toEqual(["primary-model"]);
  });
}, 20_000);
