import Image from "next/image";
import Link from "next/link";
import { coverFor } from "@/lib/covers";

/**
 * MTK signature band (Summit): Mike's photo and the four-step path through the course
 * (assessment → results → My Plan → mastery) so Results and My Plan read as one journey.
 */
export function MtkPath({ at, slug, title, sub }: { at: 1 | 2 | 3; slug: string; title: string; sub: string }) {
  const cover = coverFor(slug);
  const steps = [
    { label: "Assessment", href: `/intake/${slug}?answers=1` },
    { label: "Your results", href: "/mtk/results" },
    { label: "My Plan", href: "/mtk" },
    { label: "Mastery", href: `/programs/${slug}/course` },
  ];
  return (
    <header className="mtk-band">
      <div className="mtk-band-panel">
        <Link href={`/programs/${slug}/course`} className="mtk-band-back">Mastering the Kettlebell</Link>
        <p className="mtk-band-t">{title}</p>
        <p className="mtk-band-s">{sub}</p>
        <ol className="mtk-band-steps">
          {steps.map((s, i) => {
            const state = i < at ? "done" : i === at ? "now" : undefined;
            return (
              <li key={s.label} data-s={state}>
                {i <= at ? <Link href={s.href}><span>{i < at ? "✓" : i + 1}</span>{s.label}</Link> : <span className="mtk-band-off"><span>{i + 1}</span>{s.label}</span>}
              </li>
            );
          })}
        </ol>
      </div>
      <figure className="mtk-band-photo">
        <Image src={cover.src} alt={cover.alt} fill sizes="(min-width: 768px) 280px, 100vw" priority style={{ objectPosition: cover.focal }} />
      </figure>
    </header>
  );
}
