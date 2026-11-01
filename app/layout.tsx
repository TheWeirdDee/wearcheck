import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", weight: ["500", "600", "700"], display: "swap" });

const origin = process.env.APP_ORIGIN ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: { default: "WearCheck — check your outfit against the invitation", template: "%s · WearCheck" },
  description:
    "Add the invitation and a photo of your outfit. See what matches the dress code, and preview one change with YouCam's virtual try-on if you need one.",
  applicationName: "WearCheck",
  openGraph: {
    type: "website",
    siteName: "WearCheck",
    title: "WearCheck — an outfit you own, an occasion to get right",
    description: "Check the outfit you already own against the invitation. Keep it, or preview one justified change.",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3eee5" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
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
