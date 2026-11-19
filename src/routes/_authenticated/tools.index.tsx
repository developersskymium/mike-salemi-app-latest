import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bookmark, Dumbbell, StretchHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { SectionHeading } from "@/components/media";
import { SaveCard } from "@/components/save-card";
import { ListSkeleton, EmptyState } from "@/components/ui-kit";
import { useSaves } from "@/lib/use-saves";
import { tools } from "@/content/tools";
import { MotifBellRack, toolMotifBySlug } from "@/components/tool-motifs";


const ICONS: Record<string, typeof Dumbbell> = {
  "kettlebell-selector": Dumbbell,
  "stretch-test": StretchHorizontal,
};

export const Route = createFileRoute("/_authenticated/tools/")({
  head: () => ({
    meta: [
      { title: "Tools — Mike Salemi App" },
      {
        name: "description",
        content: "Answer a few questions and get a straight answer: kettlebell weight selection and a mobility stretch test.",
      },
      { property: "og:title", content: "Tools — Mike Salemi App" },
      {
        property: "og:description",
        content: "Coaching tools that turn a short questionnaire into a clear recommendation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  const { items, isLoading } = useSaves();
  const toolSaves = items.filter((item) => item.kind === "tool");

  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow="Coaching tools"
          title="Tools"
          lede="Short flows that ask only what matters, then return a specific recommendation you can act on today."
          meta={`${tools.length} tools · results saved to your account`}
        />

        <Section tight>
          <div className="stagger grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => {
              const Icon = ICONS[tool.id] ?? Dumbbell;
              const Motif = toolMotifBySlug[tool.slug] ?? MotifBellRack;
              const saved = items.filter((item) => item.sourceId === tool.id).length;
              return (
                <Link
                  key={tool.id}
                  to="/tools/$toolSlug"
                  params={{ toolSlug: tool.slug }}
                  className="pressable group steel-card flex h-full flex-col overflow-hidden rounded-3xl transition-colors hover:border-primary/40 focus-visible:border-primary/60"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-hairline">
                    <Motif className="h-full w-full" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <h2 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">
                        {tool.title}
                      </h2>
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{tool.tagline}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-hairline pt-3.5">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                        Start
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                      {saved > 0 ? (
                        <span className="text-[11px] font-medium text-muted-foreground/70">
                          {saved} saved
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>

        <Section>
          <SectionHeading eyebrow="Free resources" title="Kettlebell Roadmap" />
          <Link to="/courses/$courseSlug" params={{ courseSlug: "kettlebell-roadmap" }} className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4 transition-colors hover:border-foreground/25">
            <span>
              <span className="block text-sm font-semibold text-foreground">Kettlebell Roadmap</span>
              <span className="block text-xs text-muted-foreground">Four training phases with skills and video demonstrations</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
          </Link>
        </Section>

        <Section>
          <SectionHeading
            eyebrow="Your results"
            title="Recent saves"
            action={
              <Link to="/library" className="shrink-0 text-sm font-semibold text-primary">
                Library
              </Link>
            }
          />
          {isLoading ? (
            <ListSkeleton rows={3} className="mt-5" />
          ) : toolSaves.length === 0 ? (
            <EmptyState
              className="mt-5"
              icon={Bookmark}
              title="No saved results yet"
              description="Finish any tool above and the recommendation is stored here."
            />
          ) : (
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {toolSaves.slice(0, 6).map((item) => (
                <SaveCard key={item.id} item={item} compact />
              ))}
            </div>
          )}
        </Section>
      </div>
    </AppShell>
  );
}
