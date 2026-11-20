import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button, Chip, EmptyState, Glass, Icon } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { ToolGlyph } from "@/components/discover/ProgramCard";
import { MovementCover } from "@/components/discover/library/MovementCover";
import { LISTED_TOOLS, TOOL_META, TOOL_PHOTO, isListedTool } from "@/components/discover/tools/meta";
import "@/components/discover/library/library.css";
import { loadToolsIndex } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";
import "@/components/discover/tools/tools.css";

export const metadata: Metadata = {
  title: "Tools",
  description: "Answer a few questions and get a straight answer: the right kettlebell for you, and a mobility stretch test.",
};

const NAMES: Record<string, string> = Object.fromEntries(Object.entries(TOOL_META).map(([k, v]) => [k, v.title]));

/** Tools index: hero → the two listed tool cards (Kettlebell Selector, Stretch Test) → Your results (recent saves). */
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
  // Only the listed tools (Kettlebell Selector, Stretch Test), in that order; the rest stay unlisted.
  const cards = data.tools.filter((t) => isListedTool(t.id)).sort((a, b) => LISTED_TOOLS.indexOf(a.id as never) - LISTED_TOOLS.indexOf(b.id as never));
  const recent = data.recent.filter((r) => isListedTool(r.tool_id));
  const savedBy = (id: string) => recent.filter((r) => r.tool_id === id).length;
  return (
    <>
      <div className="w1-tools">
        <header className="w1-tools-hero2">
          <div className="w1-tools-hero2-text">
            <p className="lq-eyebrow" data-tone="accent">Coaching tools</p>
            <h1 className="lq-d-xl">Straight answers in two minutes</h1>
            <p className="lq-lede lq-c2">Short flows that ask only what matters, then return a specific recommendation you can act on today.</p>
            <div className="w1-tools-hero2-meta">
              <Chip variant="tint" size="sm" icon="tools">{cards.length} free tools</Chip>
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
                  {TOOL_PHOTO[t.id] ? (
                    <span className="w1-toolcard-photo">
                      <Image src={TOOL_PHOTO[t.id]!.src} alt={TOOL_PHOTO[t.id]!.alt} fill sizes="(min-width: 1024px) 360px, 100vw" style={{ objectPosition: TOOL_PHOTO[t.id]!.focal }} />
                      <span className="w1-toolcard-glyph" aria-hidden>
                        <MovementCover move={TOOL_META[t.id]?.move ?? "swing"} seed={t.id} level={t.id === "readiness-check" ? "on-ramp" : t.id === "stretch-test" ? "phase-3" : "phase-1"} size={52} />
                      </span>
                    </span>
                  ) : (
                    <span className="w1-toolcard-art" aria-hidden>
                      <MovementCover move={TOOL_META[t.id]?.move ?? "swing"} seed={t.id} level={t.id === "readiness-check" ? "on-ramp" : t.id === "stretch-test" ? "phase-3" : "phase-1"} size={150} />
                    </span>
                  )}
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

        <section aria-labelledby="saves-t" className="w1-tools-sec">
          <div className="w1-tools-head w1-tools-headrow">
            <div>
              <p className="w1-eyebrow">Your results</p>
              <h2 id="saves-t" className="lq-d-md">Recent saves</h2>
            </div>
            <Link href="/you/saves?kind=tools" className="lq-t15 w1-tools-all">All saves <Icon name="chevron" size="xs" /></Link>
          </div>
          {recent.length ? (
            <ul className="w1-tools-saves">
              {recent.map((r) => (
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
