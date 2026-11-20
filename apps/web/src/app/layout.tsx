import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { THEME_SCRIPT } from "@/components/shell/theme";
import "./globals.css";

/*
 * Summit type, self-hosted and preloaded by next/font (no layout shift: next/font generates
 * metric-matched fallbacks, so text keeps its box while the files load).
 * Archivo (variable, 100–900) for headlines and numbers; Inter (variable) for text.
 */
const archivo = localFont({
  src: "./fonts/archivo-var.woff2",
  variable: "--ff-archivo",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: true,
});
const inter = localFont({
  src: "./fonts/inter-var.woff2",
  variable: "--ff-inter",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: true,
});

export const metadata: Metadata = {
  title: { default: "Mike Salemi", template: "%s · Mike Salemi" },
  description: "Train with Mike Salemi: Kettlebell Lifestyle, Mastering the Kettlebell, retreats and coaching.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Mike Salemi" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F2EC" },
    { media: "(prefers-color-scheme: dark)", color: "#101215" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="system" className={`${archivo.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
