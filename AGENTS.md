# Mike Salemi App v2 — rules for every agent

- Monorepo (pnpm + Turborepo). `apps/web` = Next.js 16 web app (read `apps/web/AGENTS.md` and `apps/web/node_modules/next/dist/docs` before writing Next code). `packages/core` = platform-neutral training engine (no React/DOM). `packages/api` = typed data layer over Supabase, shared by web now and the phone apps later. `packages/tokens` = design tokens. `packages/content` = import scripts and seeds. `supabase/migrations` = the database, in order.
- Database: Supabase project `ttkkuqivosiuqkbxmhbq` (v2). The old project `xdhuyzuxutrsexjjtggp` is read-only source data. The sandbox cannot reach Supabase over HTTP; use the Supabase MCP tools.
- Members never write access, orders, points, badges or certificates; server functions do. Prices are computed on the server. Paid content is readable only with access.
- Every screen follows the approved design system (`packages/tokens`, docs/design). No screen ships without light + dark, phone + desktop screenshots checked.
- Stay inside the files your spec says you own. Do not commit or push unless the lead tells you to. Do not spawn agents.
- This branch (`v2`) is NOT connected to Lovable. Never push to `main`.
