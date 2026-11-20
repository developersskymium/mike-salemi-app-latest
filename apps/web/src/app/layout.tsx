import type { Metadata, Viewport } from "next";
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
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
