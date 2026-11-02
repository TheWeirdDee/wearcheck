export type ErrorAction =
  | "RETRY"
  | "RETAKE_PHOTO"
  | "REPLACE_FILE"
  | "ENTER_MANUALLY"
  | "EDIT_REQUIREMENTS"
  | "CHOOSE_ANOTHER_ITEM"
  | "START_NEW_CHECK"
  | "WAIT"
  | "NONE";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public retryable = false,
    public action: ErrorAction = "NONE",
    public retryAfter: number | null = null,
  ) {
    super(message);
  }
}

export type ErrorEnvelope = {
  error: { code: string; message: string; retryable: boolean; action: ErrorAction; retryAfter?: number };
};

export function envelope(e: AppError): ErrorEnvelope {
  return { error: { code: e.code, message: e.message, retryable: e.retryable, action: e.action, ...(e.retryAfter !== null ? { retryAfter: e.retryAfter } : {}) } };
}

export const Errors = {
  notFound: () => new AppError("NOT_FOUND", "We couldn't find that check. It may have been deleted or expired.", 404, false, "START_NEW_CHECK"),
  forbiddenOrigin: () => new AppError("BAD_ORIGIN", "This request didn't come from WearCheck.", 403),
  rateLimited: (what: string, retryAfter = 60) => new AppError("RATE_LIMITED", `The limit for ${what} has been reached. Try again in ${Math.ceil(retryAfter / 60)} minute(s). Your existing checks remain available.`, 429, true, "WAIT", retryAfter),
  config: () => new AppError("SERVICE_UNAVAILABLE", "WearCheck isn't fully configured right now.", 503, true, "RETRY"),
};
