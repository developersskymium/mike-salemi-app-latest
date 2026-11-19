import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Dumbbell, Eye, EyeOff, Library, Sparkles, Trophy } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requestPasswordReset, sendWelcomeEmail } from "@/lib/account-email.functions";

import { Wordmark, ThemeToggle } from "@/components/app-shell";
import brandPhoto from "@/assets/kb-fallback.asset.json";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Kettlebell Lifestyle" },
      { name: "description", content: "Sign in to track your Kettlebell Lifestyle progress across devices." },
      { property: "og:title", content: "Sign in — Kettlebell Lifestyle" },
      { property: "og:description", content: "Access your program, library and saved tool results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const VALUE_PROPS = [
  { icon: Dumbbell, text: "Structured daily training" },
  { icon: Library, text: "Video library & smart tools" },
  { icon: Trophy, text: "Progress that follows you" },
];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const resetPassword = useServerFn(requestPasswordReset);
  const welcomeEmail = useServerFn(sendWelcomeEmail);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        await resetPassword({ data: { email, origin: window.location.origin } });
        toast.success("If that email exists, a reset link is on its way.");
        setMode("signin");
        return;
      }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
        toast.success("Account created. Welcome aboard.");
        void welcomeEmail({ data: { email, name: displayName || undefined } }).catch(() => {});
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: mode === "signup" ? "/onboarding" : "/home", replace: true });

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }


  const inputClass =
    "peer w-full rounded-2xl border border-input bg-background/70 px-4 pb-2.5 pt-6 text-[0.95rem] text-foreground outline-none transition-all duration-200 placeholder:text-transparent focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10";
  const labelClass =
    "pointer-events-none absolute left-4 top-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-[0.9rem] peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-muted-foreground/70 peer-focus:top-2 peer-focus:text-[0.68rem] peer-focus:uppercase peer-focus:tracking-[0.14em] peer-focus:text-primary";

  const heading =
    mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";
  const sub =
    mode === "forgot"
      ? "Enter your email and we'll send a secure link to set a new password."
      : mode === "signup"
        ? "One account for your program, library, tools and every rep you log."
        : "Your current day, streak and saved results are waiting for you.";

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-canvas lg:flex-row">
      {/* Cinematic brand panel */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden px-10 py-10 lg:flex lg:w-[52%] xl:px-16 xl:py-14">
        <img
          src={brandPhoto.url}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground/90 via-foreground/75 to-primary/55"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 top-1/3 h-[34rem] w-[34rem] rounded-full bg-primary/30 blur-3xl"
          aria-hidden
        />
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="inline-flex items-baseline gap-1 whitespace-nowrap text-lg font-extrabold leading-none tracking-tight">
            <span className="text-background">KETTLEBELL</span>
            <span className="text-primary">LIFESTYLE</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3 py-1.5 text-background/90 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Members area
          </p>
          <h1 className="display mt-6 text-[2.75rem] leading-[1.05] text-background xl:text-[3.4rem]">
            Train with intention.
            <br />
            Progress with clarity.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-background/80">
            A complete kettlebell system — daily immersion, self-guided maps, assessment tools and a video library that
            travels with you.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {VALUE_PROPS.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="rounded-2xl border border-background/15 bg-background/10 p-4 text-background backdrop-blur-md"
              >
                <Icon className="h-4 w-4" />
                <p className="mt-3 text-[0.8rem] font-medium leading-snug text-background/90">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-background/60">
          © {new Date().getFullYear()} Kettlebell Lifestyle. All rights reserved.
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex w-full flex-1 flex-col lg:w-[48%]">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-center justify-between px-5 py-4 lg:justify-end lg:px-10">
          <span className="lg:hidden">
            <Wordmark />
          </span>
          <ThemeToggle />
        </div>

        <div className="relative flex flex-1 items-center justify-center px-5 pb-10 sm:px-8 lg:pb-16">
          <div className="w-full max-w-md animate-pop rounded-[1.75rem] border border-hairline bg-surface p-6 raise sm:p-8">
            {mode !== "forgot" ? (
              <div className="mb-7 grid grid-cols-2 gap-1 rounded-2xl bg-subtle p-1">
                {(["signin"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={cn(
                      "tap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                      mode === m
                        ? "bg-surface text-foreground raise-soft"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>
            ) : null}

            <h2 className="display text-[1.7rem] leading-tight text-foreground">{heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sub}</p>

            <form onSubmit={onSubmit} className="mt-7 space-y-3.5">
              {mode === "signup" && (
                <div className="relative animate-fade">
                  <input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClass}
                    placeholder="Your name"
                  />
                  <label className={labelClass} htmlFor="displayName">
                    Name
                  </label>
                </div>
              )}
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
                <label className={labelClass} htmlFor="email">
                  Email
                </label>
              </div>
              {mode !== "forgot" && (
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(inputClass, "pr-12")}
                    placeholder="Your password"
                  />
                  <label className={labelClass} htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="tap absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground hover:bg-subtle hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {mode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              <button type="submit" disabled={busy} className={cn(buttonStyles.primary, "w-full")}>
                {busy ? <Spinner /> : null}
                {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                {!busy ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>

            {mode === "forgot" ? (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Back to sign in
                </button>
              </p>
            ) : (
              <div className="mt-7 space-y-2.5 border-t border-hairline pt-5">
                {["Private members area — no ads, no noise", "Progress syncs across every device"].map((line) => (
                  <p key={line} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" /> {line}
                  </p>
                ))}
              </div>
            )}

            <p className="mt-6 text-center text-xs">
              <Link to="/" className="text-muted-foreground underline-offset-4 hover:underline">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

