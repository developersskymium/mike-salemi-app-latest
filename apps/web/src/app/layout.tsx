import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { THEME_SCRIPT } from "@/components/shell/theme";
import "./globals.css";

/*
 * Summit v4 type, self-hosted from @fontsource and preloaded by next/font (no layout shift:
 * next/font generates size-matched Arial / Georgia fallbacks, so text keeps its box while the files load).
 * Instrument Sans (variable, 400–700) for everything; Instrument Serif italic only for Mike's notes and quotes.
 */
const sans = localFont({
  src: "../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
  variable: "--ff-sans",
  weight: "400 700",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: true,
});
const serif = localFont({
  src: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2",
  variable: "--ff-serif",
  weight: "400",
  style: "italic",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  preload: false,
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
    { media: "(prefers-color-scheme: light)", color: "#F6F7F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0B111A" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="system" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
