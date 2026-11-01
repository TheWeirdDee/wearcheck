/** The WearCheck mark: a check whose long stroke ends in a coat-hanger hook. */
export const MARK_PATH = "M7.5 17.5 L13 23 L23.2 10.6 C25.6 7.7 23.4 4.6 20.6 5.6";

export function LogoMark({ className = "size-8", tile = true }: { className?: string; tile?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      {tile ? <rect width="32" height="32" fill="var(--ink)" /> : null}
      <path d={MARK_PATH} fill="none" stroke={tile ? "var(--bg)" : "currentColor"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-8 sm:size-9" />
      <span className="font-display text-[1.2rem] font-semibold tracking-[-0.03em] sm:text-[1.35rem]">WearCheck</span>
    </span>
  );
}
