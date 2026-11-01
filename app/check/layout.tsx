import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Workflow screens: focused header, no marketing footer. */
export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader variant="workflow" />
      {children}
    </>
  );
}
