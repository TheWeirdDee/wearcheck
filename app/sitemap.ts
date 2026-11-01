import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";
  return ["", "/demo", "/help", "/privacy"].map((p) => ({ url: `${origin}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));
}
