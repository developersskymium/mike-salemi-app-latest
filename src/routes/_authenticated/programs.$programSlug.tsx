import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { AppShell, Container } from "@/components/app-shell";
import { ContextBar, Section } from "@/components/page-kit";
import { SectionHeading, Pill } from "@/components/media";
import { buttonStyles } from "@/components/ui-kit";
import { ProgramCard } from "@/components/program-promo";
import { externalPrograms, findProgram } from "@/content/programs";
import { CheckoutSheet, type CheckoutItem } from "@/components/checkout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/programs/$programSlug")({
  head: ({ params }) => {
    const program = findProgram(params.programSlug);
    const title = program
      ? `${program.name} — Mike Salemi`
      : "Program — Kettlebell Lifestyle";
    const description = program?.tagline ?? "A program from Mike Salemi.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProgramDetailPage,
});

function ProgramDetailPage() {
  const { programSlug } = Route.useParams();
  const program = findProgram(programSlug);
  const [checkout, setCheckout] = useState<CheckoutItem | null>(null);
  const [purchased, setPurchased] = useState(false);

  if (!program) {
    return (
      <AppShell>
        <Container className="section">
          <p className="text-sm text-muted-foreground">That program does not exist.</p>
          <Link to="/programs" className={cn(buttonStyles.outline, "mt-4")}>
            All programs
          </Link>
        </Container>
      </AppShell>
    );
  }

  const others = externalPrograms.filter((p) => p.id !== program.id).slice(0, 3);

  return (
    <AppShell>
      <ContextBar
        backTo="/programs"
        backLabel="All programs"
        title={program.name}
        meta={program.kind}
        action={
          !program.status && program.route ? (
            <Link
              to={program.route}
              className="pressable inline-flex h-9 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              {program.routeLabel ?? "Open"}
            </Link>
          ) : undefined
        }
      />

      <div className="animate-page">
        <Container className="section-tight">
          <div className="relative overflow-hidden rounded-[1.75rem]">
            <img
              src={program.image}
              alt={program.name}
              className="h-[52vh] max-h-[28rem] min-h-[17rem] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/70">
                {program.kind}
              </p>
              <h1 className="mt-2 max-w-[18ch] text-3xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl">
                {program.name}
              </h1>
              <p className="mt-3 max-w-[46ch] text-sm text-white/80 sm:text-base">{program.tagline}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {program.status ? (
                  <span className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white/80 backdrop-blur">{program.status} only</span>
                ) : program.route ? (
                  <Link
                    to={program.route}
                    className="pressable inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black"
                  >
                    {program.routeLabel ?? "Open"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : program.priceCents ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCheckout({
                        productId: `program-${program.id}`,
                        kind: "program",
                        name: program.name,
                        summary: program.tagline,
                        variant: program.format,
                        priceCents: program.priceCents!,
                        terms: "One-time payment · lifetime access",
                      })
                    }
                    className="pressable inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black"
                  >
                    {purchased ? "You own this" : `Enrol · ${program.price}`}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <Link
                    to="/coaching"
                    className="pressable inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black"
                  >
                    Talk to Mike about it
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <span className="inline-flex h-11 items-center rounded-full border border-white/25 px-4 text-xs font-medium text-white/85 backdrop-blur">
                  {program.status ? "No purchase available" : program.price}
                </span>
              </div>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Fact label="Format" value={program.format} />
            <Fact label="Commitment" value={program.commitment} />
            <Fact label="Investment" value={program.price} />
          </dl>

          <p className="measure mt-6 text-sm leading-relaxed text-muted-foreground">{program.description}</p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {program.highlights.map((h) => (
              <li key={h}>
                <Pill>{h}</Pill>
              </li>
            ))}
          </ul>
        </Container>

        {program.sections.map((section) => (
          <Section key={section.heading}>
            <SectionHeading title={section.heading} />
            <p className="measure mt-4 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            {section.points && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {section.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2 rounded-2xl border border-hairline bg-surface/50 px-4 py-3 text-sm text-foreground"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ))}

        <Section>
          <SectionHeading eyebrow="Before you commit" title="Questions people ask" />
          <div className="mt-5 space-y-2">
            {program.faq.map((item) => (
              <details key={item.q} className="rounded-2xl border border-hairline bg-surface/50 px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section>
          <SectionHeading eyebrow="Keep looking" title="Other programs" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((p) => (
              <ProgramCard key={p.id} program={p} compact />
            ))}
          </div>
        </Section>
      </div>

      <CheckoutSheet item={checkout} onClose={() => setCheckout(null)} onSuccess={() => setPurchased(true)} />
    </AppShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface/50 px-4 py-3">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-snug text-foreground">{value}</dd>
    </div>
  );
}
