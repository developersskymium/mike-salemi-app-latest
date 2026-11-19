import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Flame, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { getProfile } from "@/lib/progress.functions";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export function useIdentity() {
  const { user, loading } = useSession();
  const fetchProfile = useServerFn(getProfile);
  const { data, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });

  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const name =
    data?.display_name?.trim() ||
    meta.full_name?.trim() ||
    meta.name?.trim() ||
    user?.email?.split("@")[0] ||
    "";
  const pretty = name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
  const firstName = pretty.split(/[\s.]+/)[0] ?? "";

  return {
    loading,
    profileLoading: Boolean(user) && profileLoading,
    user,
    name: pretty,
    firstName,
    email: user?.email ?? "",
    avatarUrl: data?.avatar_url || meta.avatar_url || meta.picture || "",
    initials:
      pretty
        .split(/[\s.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "K",
  };
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late session";
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

export function Avatar({
  src,
  initials,
  size = 40,
  ring = true,
  className,
}: {
  src?: string;
  initials: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full transition-transform duration-300 [transition-timing-function:var(--ease-spring)]",
        ring && "p-[2px]",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: ring ? "var(--gradient-primary)" : undefined,
      }}
    >
      <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-elevated">
        {src && !broken ? (
          <img
            src={src}
            alt=""
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="display font-semibold text-foreground"
            style={{ fontSize: Math.max(11, size * 0.36) }}
          >
            {initials}
          </span>
        )}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* CountUp — animated numerals for metric micro-interactions           */
/* ------------------------------------------------------------------ */

export function CountUp({
  value,
  suffix = "",
  duration = 900,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(origin + (value - origin) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={cn("numeric tabular-nums", className)}>
      {shown}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Greeting bar — personalised desktop top strip                       */
/* ------------------------------------------------------------------ */

export function GreetingBar({ streak, right }: { streak?: number; right?: React.ReactNode }) {
  const { firstName, avatarUrl, initials } = useIdentity();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const date = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar src={avatarUrl} initials={initials} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {greetingFor(now)}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <p className="truncate text-xs text-muted-foreground">{date}</p>
        </div>
        {typeof streak === "number" && streak > 0 && (
          <span className="animate-pop hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary lg:inline-flex">
            <Flame className="h-3.5 w-3.5" />
            {streak} day{streak === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme();
  const light = theme === "light";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      className="tap relative h-7 w-12 rounded-full border border-hairline bg-surface/70"
    >
      <span
        className={cn(
          "absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-elevated text-primary shadow-[var(--shadow-command)] transition-all duration-300 [transition-timing-function:var(--ease-spring)]",
          light ? "left-0.5" : "left-[1.6rem]",
        )}
      >
        {light ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* User menu — avatar popover                                          */
/* ------------------------------------------------------------------ */

export function UserMenu({ className }: { className?: string }) {
  const { name, email, avatarUrl, initials } = useIdentity();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="pressable grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-hairline bg-surface/50 px-2.5 py-2 text-left hover:border-primary/40"
      >
        <Avatar src={avatarUrl} initials={initials} size={34} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">
            {name || "Your profile"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{email}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-300 [transition-timing-function:var(--ease-spring)]",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-pop absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-full min-w-[13rem] overflow-hidden rounded-2xl border border-hairline bg-elevated p-1.5 shadow-[var(--shadow-command)]"
        >
          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="tap flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/70"
          >
            <User className="h-4 w-4 text-muted-foreground" /> Profile
          </Link>
          <Link
            to="/onboarding"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="tap flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/70"
          >
            <Settings className="h-4 w-4 text-muted-foreground" /> Intake answers
          </Link>
          <div className="my-1 h-px bg-hairline" />
          <div className="flex items-center justify-between gap-2 px-1.5 py-1">
            <span className="text-xs text-muted-foreground">Appearance</span>
            <ThemeSwitch />
          </div>
          <div className="my-1 h-px bg-hairline" />
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="tap flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
