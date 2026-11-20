import Link from "next/link";
import { Icon, type IconName } from "@/components/ui";
import { MOMENTS } from "./catalog";
import "./badges.css";

const fmt = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));

/**
 * Moments with Mike: a collection grid earned in ANY order — book a 1:1, join a live call, get a note,
 * finish a program, apply to / attend a retreat, refer a friend. No levels, no "up ahead": the retreat
 * is open any time.
 */
export function MomentsWithMike({ earned }: { earned: Record<string, string> }) {
  const n = MOMENTS.filter((m) => earned[m.id]).length;
  return (
    <section className="bd-moments" aria-labelledby="bd-moments-t">
      <header className="bd-fam-h">
        <div>
          <h3 id="bd-moments-t" className="lq-d-xs">
            Moments with Mike
          </h3>
          <p className="lq-t13 lq-c3">Collect them in any order. The retreat is open whenever you are.</p>
        </div>
        <span className="lq-t13 lq-c2 lq-num">
          {n} of {MOMENTS.length}
        </span>
      </header>
      <ul className="bd-mgrid" role="list">
        {MOMENTS.map((m) => {
          const at = earned[m.id];
          return (
            <li key={m.id}>
              <Link href={m.href} className="bd-moment lq-press" data-earned={at ? "" : undefined} aria-label={`${m.title}${at ? `, collected ${fmt(at)}` : `: ${m.how}`}`}>
                <span className="bd-moment-ic" aria-hidden>
                  <Icon name={m.icon as IconName} size="sm" />
                  {at && (
                    <i className="bd-moment-ok">
                      <Icon name="check" size="xs" />
                    </i>
                  )}
                </span>
                <b className="bd-moment-t">{m.title}</b>
                <span className="lq-t12 lq-c3">{at ? `Collected ${fmt(at)}` : m.how}</span>
                {!at && (
                  <span className="bd-moment-go">
                    {m.cta} <Icon name="arrowRight" size="xs" />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
