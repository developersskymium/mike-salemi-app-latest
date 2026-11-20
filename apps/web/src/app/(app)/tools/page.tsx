import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button, Chip, EmptyState, Glass, Icon } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { ToolGlyph } from "@/components/discover/ProgramCard";
import { MovementCover } from "@/components/discover/library/MovementCover";
import { TOOL_META } from "@/components/discover/tools/meta";
import "@/components/discover/library/library.css";
import { loadToolsIndex } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";
import "@/components/discover/tools/tools.css";

export const metadata: Metadata = {
  title: "Tools",
  description: "Answer a few questions and get a straight answer: kettlebell selection, a mobility stretch test, readiness and your roadmap phase.",
};

const NAMES: Record<string, string> = Object.fromEntries(Object.entries(TOOL_META).map(([k, v]) => [k, v.title]));

/** Tools index, legacy layout: PageHead → tool cards → Free resources (Roadmap) → Your results (recent saves). */
export default async function ToolsPage() {
  const { supabase, user } = await getUser();
  let data;
  try {
    data = await loadToolsIndex(supabase, user!.id);
  } catch {
    return (
      <EmptyState
        title="Tools didn't load"
        body="Check your connection and try again."
        illustration={<EmptyScene scene="offline" size={160} />}
        action={<Button variant="glass" size="md" href="/tools">Try again</Button>}
      />
    );
  }
  const cards = data.tools.filter((t) => t.id !== "kettlebell-roadmap");
  const roadmap = data.tools.find((t) => t.id === "kettlebell-roadmap");
  const savedBy = (id: string) => data.recent.filter((r) => r.tool_id === id).length;
  return (
    <>
      <div className="w1-tools">
        <header className="w1-tools-hero2">
          <div className="w1-tools-hero2-text">
            <p className="lq-eyebrow" data-tone="accent">Coaching tools</p>
            <h1 className="lq-d-xl">Straight answers in two minutes</h1>
            <p className="lq-lede lq-c2">Short flows that ask only what matters, then return a specific recommendation you can act on today.</p>
            <div className="w1-tools-hero2-meta">
              <Chip variant="tint" size="sm" icon="tools">{data.tools.length} free tools</Chip>
              <Chip variant="fill" size="sm" icon="bookmark">Results saved to your account</Chip>
              <Chip variant="fill" size="sm" icon="share">Shareable result cards</Chip>
            </div>
          </div>
          <div className="w1-tools-hero2-photo">
            <Image src="/media/summit/mike-goblet.jpg" alt="Mike Salemi holding a kettlebell" fill priority sizes="(min-width: 1024px) 460px, 100vw" style={{ objectFit: "cover", objectPosition: "50% 20%" }} />
          </div>
        </header>

        <ul className="w1-tools-grid">
          {cards.map((t) => (
            <li key={t.id}>
              <Link href={`/tools/${t.id}`} className="w1-cardlink">
                <Glass radius="card" interactive className="w1-toolcard lq-lift">
                  <span className="w1-toolcard-art" aria-hidden>
                    <MovementCover move={TOOL_META[t.id]?.move ?? "swing"} seed={t.id} level={t.id === "readiness-check" ? "on-ramp" : t.id === "stretch-test" ? "phase-3" : "phase-1"} size={150} />
                  </span>
                  <span className="w1-toolcard-body">
                    <span className="lq-d-sm">{TOOL_META[t.id]?.title ?? t.name}</span>
                    {t.tagline && <span className="lq-t15 lq-c2">{t.tagline}</span>}
                    {TOOL_META[t.id] && (
                      <span className="lq-t13 w1-toolcard-promise">
                        <Icon name="sparkle" size="xs" /> {TOOL_META[t.id]!.promise}
                      </span>
                    )}
                    <span className="w1-toolcard-foot">
                      <span className="w1-toolcard-go lq-t15">Start <Icon name="chevron" size="xs" /></span>
                      <span className="lq-t12 lq-c2">
                        {TOOL_META[t.id]?.minutes ?? 1} min{savedBy(t.id) > 0 ? ` · ${savedBy(t.id)} saved` : ""}
                      </span>
                    </span>
                  </span>
                </Glass>
              </Link>
            </li>
          ))}
        </ul>

        {roadmap && (
          <section aria-labelledby="free-t" className="w1-tools-sec">
            <div className="w1-tools-head">
              <p className="w1-eyebrow">Free resources · Kettlebell Roadmap</p>
              <h2 id="free-t" className="lq-d-md">{TOOL_META["kettlebell-roadmap"]!.title} <Chip variant="warm" size="sm">Title draft</Chip></h2>
            </div>
            <div className="w1-tools-free">
              <Link href={`/tools/${roadmap.id}`} className="w1-cardlink">
                <Glass radius="card" interactive className="w1-tools-row lq-lift">
                  <span className="w1-tools-rowart" aria-hidden><ToolGlyph id={roadmap.id} size={60} animated={false} /></span>
                  <span className="w1-tools-rowtext">
                    <span className="lq-t17">Take the 2-minute phase check</span>
                    <span className="lq-t13 lq-c2">{roadmap.tagline ?? "The four fundamental lifts, and your next step"}</span>
                  </span>
                  <Icon name="chevron" size="sm" className="lq-c3" />
                </Glass>
              </Link>
              <Link href="/programs/kettlebell-roadmap" className="w1-cardlink">
                <Glass radius="card" interactive className="w1-tools-row lq-lift">
                  <span className="w1-tools-rowart" aria-hidden><Icon name="play" /></span>
                  <span className="w1-tools-rowtext">
                    <span className="lq-t17">Kettlebell Roadmap</span>
                    <span className="lq-t13 lq-c2">Four training phases with skills and video demonstrations</span>
                  </span>
                  <Icon name="chevron" size="sm" className="lq-c3" />
                </Glass>
              </Link>
            </div>
          </section>
        )}

        <section aria-labelledby="saves-t" className="w1-tools-sec">
          <div className="w1-tools-head w1-tools-headrow">
            <div>
              <p className="w1-eyebrow">Your results</p>
              <h2 id="saves-t" className="lq-d-md">Recent saves</h2>
            </div>
            <Link href="/you/saves?kind=tools" className="lq-t15 w1-tools-all">All saves <Icon name="chevron" size="xs" /></Link>
          </div>
          {data.recent.length ? (
            <ul className="w1-tools-saves">
              {data.recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/tools/${r.tool_id}`} className="w1-cardlink">
                    <Glass radius="panel" interactive className="w1-tools-save lq-lift">
                      <span className="w1-tools-saveart" aria-hidden><ToolGlyph id={r.tool_id} size={44} animated={false} /></span>
                      <span className="w1-tools-rowtext">
                        <span className="lq-t12 lq-c2">{NAMES[r.tool_id] ?? r.tool_id} · {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                        <span className="lq-t15 w1-clamp1">{r.title ?? "Result"}</span>
                        {r.summary && <span className="lq-t12 lq-c2 w1-clamp2">{r.summary}</span>}
                      </span>
                    </Glass>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No saved results yet" body="Finish any tool above and the recommendation is stored here." illustration={<EmptyScene scene="nothing-saved" size={130} />} />
          )}
        </section>
      </div>
    </>
  );
}
