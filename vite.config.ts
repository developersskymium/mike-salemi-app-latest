// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Cache public build assets only. Member HTML must never survive sign-out.
      // Registration happens only from src/lib/register-sw.ts (never in dev/preview).
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        manifest: false,
        devOptions: { enabled: false },
        workbox: {
          globPatterns: ["**/*.{js,css,woff2}"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          runtimeCaching: [
            {
              // Hashed build assets are immutable.
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && ["script", "style", "font", "worker"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "kbl-assets",
                expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === "image",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "kbl-images",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 14 },
              },
            },
            {
              // Vimeo poster thumbnails.
              urlPattern: ({ url }) => url.hostname.endsWith("vimeocdn.com"),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "kbl-vimeo-thumbs",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
              },
            },
          ],
        },
      }),
    ],
  },
});
