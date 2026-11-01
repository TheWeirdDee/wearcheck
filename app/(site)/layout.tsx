import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Public informational pages: full navigation and marketing footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader variant="site" />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
