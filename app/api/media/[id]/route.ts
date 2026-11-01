import { handler } from "@/lib/api";
import { requireOwnedAsset } from "@/lib/checks";
import { thumbnail } from "@/lib/images";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Serves a private image to its owner only. Access is re-authorised on every request from the guest
 * cookie; nothing is publicly cached, and deleted or expired checks return 404 immediately.
 */
export const GET = handler("media", async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const asset = await requireOwnedAsset((await ctx.params).id);
  let bytes = await getObject(asset.storage_key);
  let type = asset.mime;
  if (new URL(req.url).searchParams.get("size") === "thumb") {
    bytes = await thumbnail(bytes);
    type = "image/jpeg";
  }
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noimageindex",
      "Content-Disposition": download ? `attachment; filename="wearcheck-${asset.kind === "render_result" ? "ai-preview" : asset.kind}.${type === "image/png" ? "png" : "jpg"}"` : "inline",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
});
