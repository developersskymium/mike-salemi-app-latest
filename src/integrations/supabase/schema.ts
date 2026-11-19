/**
 * Postgres schema that holds this app's tables. It is "public" on the app's
 * own Supabase project. If the app ever shares a project with another app,
 * move its tables to a dedicated schema, expose it in Supabase's Data API
 * settings, and change this value.
 */
export const DB_SCHEMA = "public" as const;
