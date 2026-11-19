import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { Avatar, greetingFor, useIdentity } from "@/components/identity";
import { useProgress } from "@/hooks/use-progress";
import { useSession } from "@/hooks/use-session";
import { computeStreakFromRows } from "@/lib/achievements";
import { statusBarHidden } from "@/lib/status-context";

/**
 * Minimal global header strip: greeting, date and streak. Nothing page
 * specific — the pages themselves carry their own titles and progress.
 */
export function StatusBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useSession();
  const { data: rows } = useProgress(Boolean(user));
  const { firstName, avatarUrl, initials } = useIdentity();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (statusBarHidden(pathname)) return null;

  const streak = computeStreakFromRows(rows);
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="sticky top-0 z-30 border-b border-hairline bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[80rem] items-center gap-2.5 px-4 py-2 sm:px-6">
        <Avatar src={avatarUrl} initials={initials} size={26} />
        <p className="truncate text-[0.8rem] font-semibold leading-tight text-foreground">
          {greetingFor(now)}
          {firstName ? `, ${firstName}` : ""}
        </p>
        <span className="hidden text-[0.72rem] text-muted-foreground sm:inline">·</span>
        <p className="hidden truncate text-[0.72rem] text-muted-foreground sm:block">{date}</p>
        {streak > 0 && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[0.68rem] font-semibold text-primary">
            <Flame className="h-3 w-3" />
            {streak}d
          </span>
        )}
      </div>
    </div>
  );
}
