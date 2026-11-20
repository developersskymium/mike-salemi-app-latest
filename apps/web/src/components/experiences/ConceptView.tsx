import Image from "next/image";
import Link from "next/link";
import { Button, Chip, Glass, Icon } from "@/components/ui";
import { DraftChip } from "@/components/commerce/DraftChip";
import { kindLabel, type ConceptProgram } from "@/lib/loaders/experiences";
import { PosterFallback } from "@/components/poster/PosterFallback";
import { ContextBar, Facts, Faq, Heading, Ticks } from "./RunParts";

/**
 * Program detail for coaching / live / challenge / retreat programs — legacy layout L3:
 * context bar → hero card → Format / Commitment / Investment → description → highlight pills →
 * sections (heading, body, ticks) → FAQ → "Keep looking" (3 compact cards).
 */
export function ConceptView({ data }: { data: ConceptProgram }) {
  const p = data.program;
  const kind = kindLabel(p.type);
  const run = data.nextRun;
  const href = p.route ?? (run ? `/experiences/${run.id}` : null);
  const label = p.route_label ?? (run ? (run.status === "waitlist" ? "Join the waitlist" : "See the dates") : null);
  const preview = !href;

  const cta = href ? (
    <Button href={href} variant="filled" size="md" iconAfter="chevron">{label ?? "Open"}</Button>
  ) : (
    <Button href="/coaching" variant="white" size="md" iconAfter="chevron">Talk to Mike about it</Button>
  );

  return (
    <div className="exp-l3">
      <ContextBar back="/programs" backLabel="All programs" title={p.name} meta={kind} action={href ? <Button size="sm" variant="filled" href={href}>{p.type === "coaching" ? "Book" : "Open"}</Button> : <Chip variant="outline">Preview</Chip>} />

      <section className="exp-l3-hero" aria-labelledby="l3-title">
        {p.hero ? <Image src={p.hero.url} alt={p.hero.alt} fill priority sizes="(min-width: 1024px) 1100px, 100vw" /> : <PosterFallback seed={p.slug} title={p.name} />}
        <div className="exp-l3-copy">
          <div className="exp-eyebrow"><span>{kind}</span>{preview && <Chip variant="clear">Preview</Chip>}<DraftChip note={p.draft_note} onPhoto /></div>
          <h1 id="l3-title" className="lq-display">{p.name}</h1>
          {p.tagline && <p className="exp-tagline">{p.tagline}</p>}
          <div className="com-row" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {cta}
            {p.price_label && <Chip variant="clear"><span className="lq-num">{p.price_label}</span></Chip>}
          </div>
        </div>
      </section>

      <div className="exp-l3-body">
        <Facts items={[
          { icon: "compass", label: "Format", value: p.format_label ?? "To be confirmed" },
          { icon: "clock", label: "Commitment", value: p.commitment ?? "To be confirmed" },
          { icon: "bookmark", label: "Investment", value: p.price_label ?? "To be confirmed" },
        ]} />

        {(p.description || p.summary) && <p className="exp-lede exp-l3-desc">{p.description ?? p.summary}</p>}
        {p.note && <p className="lq-t13 lq-c2" style={{ margin: "8px 4px 0" }}>{p.note}</p>}

        {p.highlights.length > 0 && (
          <ul className="exp-chiprow exp-l3-pills" role="list">
            {p.highlights.map((h) => <li key={h}><Chip variant="glass" icon="sparkle">{h}</Chip></li>)}
          </ul>
        )}

        {p.sections.map((s, i) => (
          <section key={s.heading} className="exp-section" aria-labelledby={`sec-${i}`}>
            <Heading title={s.heading} id={`sec-${i}`} />
            <p className="exp-measure">{s.body}</p>
            {s.points?.length ? <div style={{ marginTop: 14 }}><Ticks items={s.points} /></div> : null}
          </section>
        ))}

        {p.faq.length > 0 && (
          <section className="exp-section" aria-labelledby="l3-faq">
            <Heading eyebrow="Before you commit" title="Questions people ask" id="l3-faq" />
            <Faq items={p.faq} />
          </section>
        )}

        {data.others.length > 0 && (
          <section className="exp-section" aria-labelledby="l3-more">
            <Heading eyebrow="Keep looking" title="Other programs" id="l3-more" aside={<Link href="/programs" className="exp-textlink" style={{ margin: 0 }}>See all <Icon name="chevron" size="xs" /></Link>} />
            <div className="exp-l3-others">
              {data.others.map((o) => (
                <Link key={o.slug} href={`/programs/${o.slug}`} className="exp-l3-other lq-lift">
                  <span className="exp-l3-other-img">{o.image ? <Image src={o.image} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" /> : <PosterFallback seed={o.slug} title={o.name} compact />}</span>
                  <span className="exp-l3-other-body">
                    <span className="exp-kicker">{kindLabel(o.type)}</span>
                    <span className="lq-t15" style={{ fontWeight: 600 }}>{o.name}</span>
                    {o.tagline && <span className="lq-t13 lq-c2 exp-clamp2">{o.tagline}</span>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
