import "server-only";
import { AppError } from "./errors";
import { MAX_UPLOAD_BYTES } from "./images";

/** Reads one file field from a multipart request with a hard size cap before buffering. */
export async function readUpload(req: Request, field = "file"): Promise<{ bytes: Buffer; form: FormData }> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64_000) {
    throw new AppError("FILE_TOO_LARGE", "That image is larger than 4 MB. Please choose a smaller photo.", 413, true, "REPLACE_FILE");
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AppError("INVALID_UPLOAD", "We couldn't read that upload. Please try again.", 400, true, "REPLACE_FILE");
  }
  const file = form.get(field);
  if (!(file instanceof File)) throw new AppError("NO_FILE", "Please choose an image first.", 400, true, "REPLACE_FILE");
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("FILE_TOO_LARGE", "That image is larger than 4 MB. Please choose a smaller photo.", 413, true, "REPLACE_FILE");
  return { bytes: Buffer.from(await file.arrayBuffer()), form };
}
