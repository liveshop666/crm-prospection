import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import "./globals.css";

const body = DM_Sans({ variable: "--font-body", subsets: ["latin", "latin-ext"], weight: ["400", "500", "700"] });
const head = Barlow_Condensed({ variable: "--font-head", subsets: ["latin", "latin-ext"], weight: ["700", "800"] });

export const metadata: Metadata = {
  title: "CRM · SolveLab",
  description: "Prospects, demandes du site, RDV et offres de SolveLab au même endroit.",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "CRM SolveLab", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0b0710", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className={`${body.variable} ${head.variable} min-h-dvh`}>{children}</body>
    </html>
  );
}
