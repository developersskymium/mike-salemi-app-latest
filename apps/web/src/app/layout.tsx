import type { Metadata, Viewport } from "next";
import { font } from "@ms/tokens";
import { THEME_SCRIPT } from "@/components/shell/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mike Salemi", template: "%s · Mike Salemi" },
  description: "Train with Mike Salemi: Kettlebell Lifestyle, Mastering the Kettlebell, retreats and coaching.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Mike Salemi" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EEF3F6" },
    { media: "(prefers-color-scheme: dark)", color: "#070C17" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="system" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Trace type: Anybody (display, variable width) and Hanken Grotesk (text). */}
        {font.preload.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
