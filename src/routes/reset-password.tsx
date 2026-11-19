import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark, ThemeToggle } from "@/components/app-shell";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — Kettlebell Lifestyle" },
      { name: "description", content: "Choose a new password for your Kettlebell Lifestyle account." },
      { property: "og:title", content: "Set a new password — Kettlebell Lifestyle" },
      { property: "og:description", content: "Choose a new password for your Kettlebell Lifestyle account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated.");
      navigate({ to: "/home", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground outline-none transition-colors duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <Wordmark />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md animate-pop rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-card-foreground">Set a new password</h1>
          {!ready ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Open this page from the reset link in your email to continue.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="eyebrow text-muted-foreground" htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="eyebrow text-muted-foreground" htmlFor="confirm">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={busy} className={cn(buttonStyles.primary, "w-full")}>
                {busy && <Spinner />}
                Update password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
