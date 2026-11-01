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
  ) {
    super(message);
  }
}

export type ErrorEnvelope = {
  error: { code: string; message: string; retryable: boolean; action: ErrorAction };
};

export function envelope(e: AppError): ErrorEnvelope {
  return { error: { code: e.code, message: e.message, retryable: e.retryable, action: e.action } };
}

export const Errors = {
  notFound: () => new AppError("NOT_FOUND", "We couldn't find that check. It may have been deleted or expired.", 404, false, "START_NEW_CHECK"),
  forbiddenOrigin: () => new AppError("BAD_ORIGIN", "This request didn't come from WearCheck.", 403),
  rateLimited: (what: string) => new AppError("RATE_LIMITED", `Too many ${what} in a short time. Please wait a moment and try again.`, 429, true, "WAIT"),
  config: () => new AppError("SERVICE_UNAVAILABLE", "WearCheck isn't fully configured right now.", 503, true, "RETRY"),
};
