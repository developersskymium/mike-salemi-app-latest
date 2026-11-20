# Local preview fixtures

JSON snapshots of real v2 data used only when `MOCK_DATA=1 pnpm dev` (the build sandbox cannot reach Supabase).
Each file is the exact return value of one page loader wrapped with `mockable("<name>", …)` from `src/lib/mock`.
Create them from real rows with the Supabase MCP `execute_sql` (project ttkkuqivosiuqkbxmhbq; test member `member.test@example.com`), shaped to the loader's return type. Never put secrets here.
