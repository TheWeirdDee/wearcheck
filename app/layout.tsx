import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", weight: ["500", "600", "700"], display: "swap" });

const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: { default: "WearCheck — does your outfit fit the dress code?", template: "%s · WearCheck" },
  description:
    "Show WearCheck the invitation and the outfit you already own. Keep what works; preview the smallest justified change with a real AI try-on only when it helps.",
  applicationName: "WearCheck",
  openGraph: {
    type: "website",
    siteName: "WearCheck",
    title: "WearCheck — does your outfit fit the dress code?",
    description: "Check an outfit you already own against a real invitation. Keep what works; preview one change only when needed.",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#161513" },
  ],
};

// Runs before first paint: applies saved theme (light/dark/system) without a flash.
const themeScript = `(function(){try{var p=localStorage.getItem("wc-theme")||"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");document.documentElement.setAttribute("data-theme-pref",p)}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" className={`${inter.variable} ${interTight.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[100] bg-ink px-4 py-3 text-bg">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
