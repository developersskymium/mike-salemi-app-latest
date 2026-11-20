// TEMPORARY: lets the admin create an account before the real sign-in screens land. Remove at merge of Discover.
import { createClient } from "@/lib/supabase/server";
import { StartForms } from "./forms";

export const dynamic = "force-dynamic";

export default async function Start() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5, margin: 0 }}>Mike Salemi</h1>
        {data.user ? (
          <p style={{ marginTop: 12, opacity: 0.8 }}>You're signed in as <b>{data.user.email}</b>. You can close this tab.</p>
        ) : (
          <StartForms />
        )}
      </div>
    </main>
  );
}
