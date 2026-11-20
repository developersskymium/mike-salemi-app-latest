import type { Metadata } from "next";
import Link from "next/link";
import { UserButton } from "@/components/shell/ShellUser";
import { Button, EmptyState, Glass, Icon, LargeTitle } from "@/components/ui";
import { EmptyScene } from "@/components/graphics";
import { ToolGlyph } from "@/components/discover/ProgramCard";
import { loadToolsIndex } from "@/lib/loaders/discover";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage() {
  const { supabase } = await getUser();
  let tools;
  try {
    tools = (await loadToolsIndex(supabase)).tools;
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
  return (
    <>
      <LargeTitle title="Tools" eyebrow="Free for every member" trailing={<span className="dsc-phone-only"><UserButton /></span>} />
      <div className="dsc-stack">
        <div className="dsc-toolgrid">
          {tools.map((t, i) => (
            <Link key={t.id} href={`/tools/${t.id}`} className="dsc-cardlink">
              <Glass radius="card" interactive className="dsc-toolcard lq-lift">
                <span className="dsc-toolcard-art" aria-hidden>
                  <ToolGlyph id={t.id} size={132} />
                </span>
                <span className="dsc-toolcard-text">
                  <span className="lq-t12 lq-c2 lq-num">0{i + 1}</span>
                  <span className="lq-t20">{t.name}</span>
                  {t.tagline && <span className="lq-t13 lq-c2">{t.tagline}</span>}
                </span>
                <Icon name="chevron" size="sm" className="lq-c3 dsc-toolcard-go" />
              </Glass>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
