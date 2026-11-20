import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Button, Glass, Icon } from "@/components/ui";
import { faq, Outline, Prose, SalesHero, salesCta } from "@/components/discover/public/Sales";
import { loadSales } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await getUser();
  const page = await loadSales(supabase, slug).catch(() => null);
  if (!page) return { title: "Program" };
  return { title: page.program.name, description: page.program.tagline ?? page.program.summary ?? undefined };
}

export default async function SalesPageRoute({ params }: Params) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) notFound();
  const { supabase, user } = await getUser();
  const page = await loadSales(supabase, slug);
  if (!page) notFound();
  const p = page.program;
  const cta = salesCta(page, Boolean(user));
  const gallery = p.media.filter((m) => m.role === "gallery").slice(0, 6);
  const questions = faq(page, cta);

  return (
    <div className="dsc-sales">
      <SalesHero page={page} cta={cta} />

      {p.highlights?.length ? (
        <section className="dsc-highlights" aria-label="Highlights">
          {p.highlights.map((h, i) => (
            <Glass key={h} radius="card" className="dsc-hl">
              <span className="dsc-hl-n lq-num" aria-hidden>0{i + 1}</span>
              <p className="lq-t17">{h}</p>
            </Glass>
          ))}
        </section>
      ) : null}

      <div className="dsc-sales-body">
        <div className="dsc-sales-main">
          {p.description && (
            <section aria-labelledby="about">
              <h2 id="about" className="lq-t28">About</h2>
              <Prose text={p.description} />
            </section>
          )}
          {!p.description && p.summary && (
            <section aria-labelledby="about">
              <h2 id="about" className="lq-t28">About</h2>
              <Prose text={p.summary} />
            </section>
          )}
          {gallery.length > 0 && (
            <section aria-label="Gallery" className="dsc-gallery">
              {gallery.map((m, i) => (
                <div key={m.url + i} className="dsc-gallery-img" data-wide={i === 0 ? "" : undefined}>
                  <Image src={m.url} alt={m.alt} fill sizes="(min-width: 1024px) 400px, 50vw" />
                </div>
              ))}
            </section>
          )}
          {page.outline.length > 0 && (
            <section aria-labelledby="inside">
              <h2 id="inside" className="lq-t28">What’s inside</h2>
              <Outline outline={page.outline} lessonLabel={p.lessonLabel ?? "Lesson"} />
            </section>
          )}
          <section aria-labelledby="faq">
            <h2 id="faq" className="lq-t28">Questions</h2>
            <div className="dsc-faq">
              {questions.map((f) => (
                <details key={f.q} className="dsc-faq-row">
                  <summary className="lq-t17">
                    {f.q}
                    <Icon name="plus" size="sm" className="dsc-faq-plus lq-c2" />
                  </summary>
                  <p className="lq-t15 lq-c2">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
        <aside className="dsc-sales-aside">
          <Glass radius="card" className="dsc-buybox">
            <p className="lq-t13 lq-c2">{p.name}</p>
            {cta.price && (
              <p>
                <span className="lq-t34 lq-num">{cta.price}</span> <span className="lq-t15 lq-c2">{cta.per}</span>
              </p>
            )}
            {cta.note && <p className="lq-t13 lq-c2">{cta.note}</p>}
            <Button href={cta.href} block size="md" variant="glass">{cta.label}</Button>
            <Button href="/pricing" block size="md" variant="plain">Compare plans</Button>
          </Glass>
        </aside>
      </div>
    </div>
  );
}
