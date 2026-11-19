/**
 * This app's tables live in their own Postgres schema so it can share a
 * Supabase project with other apps without touching their `public` tables.
 * The generated types still describe them under "public", so the schema name
 * is cast for TypeScript while the real requests go to `mike_app`.
 */
export const DB_SCHEMA = "mike_app" as unknown as "public";
