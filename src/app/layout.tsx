import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font — no runtime dependency on Google Fonts,
// which matters on school Wi-Fi. System fonts are the fallback in globals.css.
const display = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "800", "900"],
});

const body = Rajdhani({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Waukee SSBU Developer Awards",
  description: "AP CSP Tournament Manager Showcase — class voting",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0618",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col bg-[#0a0618] text-white">{children}</body>
    </html>
  );
}
