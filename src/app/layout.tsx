import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM Prospection",
  description: "Mes prospects, messages, réponses et offres au même endroit.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "CRM", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0c0c0f" }, { color: "#f7f7f8" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${geist.variable} min-h-dvh`}>{children}</body>
    </html>
  );
}
