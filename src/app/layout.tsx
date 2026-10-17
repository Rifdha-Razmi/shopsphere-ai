import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ShopSphere AI — Personalized shopping", template: "%s · ShopSphere AI" },
  description: "A personalized e-commerce storefront with an explainable recommendation engine and a rule-based shopping assistant.",
  applicationName: "ShopSphere AI",
};

export const viewport: Viewport = {
  themeColor: "#4b32c3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
