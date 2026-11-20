import type { Metadata } from "next";
import Link from "next/link";
import { UserButton } from "@/components/shell/ShellUser";
import { Button, EmptyState, Glass, Icon, LargeTitle } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { ToolGlyph } from "@/components/discover/ProgramCard";
import { loadToolsIndex } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";
import "@/components/discover/tools/tools.css";

export const metadata: Metadata = {
  title: "Tools",
  description: "Answer a few questions and get a straight answer: kettlebell selection, a mobility stretch test, readiness and your roadmap phase.",
};

const NAMES: Record<string, string> = { "kettlebell-selector": "Kettlebell Selector", "stretch-test": "Stretch Test", "readiness-check": "Readiness Check", "kettlebell-roadmap": "Kettlebell Roadmap" };

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
      <LargeTitle title="Tools" eyebrow="Coaching tools" trailing={<span className="dsc-phone-only"><UserButton /></span>} />
      <div className="w1-tools">
        <p className="lq-t17 lq-c2 w1-tools-lede">
          Short flows that ask only what matters, then return a specific recommendation you can act on today.
          <span className="lq-t13 lq-c3 w1-tools-meta"> {data.tools.length} tools · results saved to your account</span>
        </p>

        <ul className="w1-tools-grid">
          {cards.map((t) => (
            <li key={t.id}>
              <Link href={`/tools/${t.id}`} className="w1-cardlink">
                <Glass radius="card" interactive className="w1-toolcard lq-lift">
                  <span className="w1-toolcard-art" aria-hidden>
                    <ToolGlyph id={t.id} size={150} />
                  </span>
                  <span className="w1-toolcard-body">
                    <span className="lq-t20">{t.name}</span>
                    {t.tagline && <span className="lq-t15 lq-c2">{t.tagline}</span>}
                    <span className="w1-toolcard-foot">
                      <span className="w1-toolcard-go lq-t15">Start <Icon name="chevron" size="xs" /></span>
                      {savedBy(t.id) > 0 && <span className="lq-t12 lq-c2">{savedBy(t.id)} saved</span>}
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
              <p className="w1-eyebrow">Free resources</p>
              <h2 id="free-t" className="lq-t22">Kettlebell Roadmap</h2>
            </div>
            <div className="w1-tools-free">
              <Link href={`/tools/${roadmap.id}`} className="w1-cardlink">
                <Glass radius="card" interactive className="w1-tools-row lq-lift">
                  <span className="w1-tools-rowart" aria-hidden><ToolGlyph id={roadmap.id} size={60} animated={false} /></span>
                  <span className="w1-tools-rowtext">
                    <span className="lq-t17">Find your phase</span>
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
              <h2 id="saves-t" className="lq-t22">Recent saves</h2>
            </div>
            <Link href="/you/saves" className="lq-t15 w1-tools-all">All saves <Icon name="chevron" size="xs" /></Link>
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
