import { loadBadges } from "@/lib/loaders/badges";
import { PROGRAM_MEDAL, descOf, medalColorOf, progressText, shortName } from "./catalog";
import { MedalPin } from "./MedalPin";
import "./badges.css";

/**
 * A program's full set of badges (first day, weeks/phases/tiers, streaks, halfway, finish…), greyed until
 * earned, each with its progress ("3 of 7") where it can be counted.
 * For program pages: `<ProgramBadges slug="athleticism-4-life" />`. Server component; renders nothing
 * when the program has no badges.
 */
export async function ProgramBadges({ slug, title = "Badges in this program" }: { slug: string; title?: string }) {
  const d = await loadBadges().catch(() => null);
  if (!d) return null;
  const list = d.defs.filter((b) => b.program_slug === slug).sort((a, z) => a.position - z.position);
  if (!list.length) return null;
  const n = list.filter((b) => d.earned[b.id]).length;
  const prog = new Map(d.progress.map((p) => [p.id, p]));
  return (
    <section className="bd-pb" aria-label={title} style={PROGRAM_MEDAL[slug] ? ({ ["--bd-c" as string]: PROGRAM_MEDAL[slug]!.color } as React.CSSProperties) : undefined}>
      <header className="bd-pb-h">
        <b className="lq-t15">{title}</b>
        <span className="lq-t13 lq-c3 lq-num">
          {n} of {list.length}
        </span>
      </header>
      <ul className="bd-pb-row" role="list">
        {list.map((b) => {
          const e = !!d.earned[b.id];
          const pt = e ? null : progressText(prog.get(b.id), b.id);
          return (
            <li key={b.id} className="bd-pb-item" data-earned={e ? "" : undefined} title={descOf(b)}>
              <MedalPin tier={b.tier} icon={b.icon} family={b.family} color={medalColorOf(b)} size={52} locked={!e} title={`${b.name}${e ? ", earned" : ", not earned yet"}`} />
              <span className="lq-t12">{shortName(b)}</span>
              {pt && <small className="lq-t12 lq-c3 lq-num bd-pb-p">{pt}</small>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
