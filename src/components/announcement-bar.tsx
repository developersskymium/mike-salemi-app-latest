import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings.functions";

/** Slim site-wide announcement bar; copy and link are managed in the admin studio. */
export function AnnouncementBar() {
  const fetchSettings = useServerFn(getSiteSettings);
  const { data } = useQuery({ queryKey: ["site-settings"], queryFn: () => fetchSettings(), staleTime: 60_000 });
  const a = data?.announcement;
  if (!a?.enabled || !a.text) return null;
  const internal = a.linkTo.startsWith("/");
  return (
    <div role="region" aria-label="Announcement" className="announce-bar animate-fade relative z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2 text-center text-[0.8125rem]">
        {a.badge && <span className="hidden shrink-0 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider sm:inline">{a.badge}</span>}
        <span className="min-w-0 truncate font-medium">{a.text}</span>
        {a.linkLabel && a.linkTo && (
          internal ? (
            <Link to={a.linkTo} className="no-btn inline-flex shrink-0 items-center gap-1 font-semibold underline-offset-4 hover:underline">{a.linkLabel} <ArrowRight className="h-3.5 w-3.5" /></Link>
          ) : (
            <a href={a.linkTo} target="_blank" rel="noreferrer" className="no-btn inline-flex shrink-0 items-center gap-1 font-semibold underline-offset-4 hover:underline">{a.linkLabel} <ArrowRight className="h-3.5 w-3.5" /></a>
          )
        )}
      </div>
    </div>
  );
}
