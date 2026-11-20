import type { Metadata } from "next";
import Image from "next/image";
import { Chip, Icon } from "@/components/ui";
import { CoachingSubNav } from "@/components/coaching/SubNav";
import { LiveList } from "@/components/coaching/LiveList";
import { loadCoachingHub } from "@/lib/loaders/coaching";
import "@/components/commerce/commerce.css";
import "@/components/coaching/coach.css";

export const metadata: Metadata = { title: "Zen Savage · Coaching", description: "Zen Savage: Mike's live group challenge. Live schedule, reminders and replays." };

const day = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

/** Idea 8 · Zen Savage: the live schedule with reminders, and the replay library. */
export default async function ZenSavagePage(props: PageProps<"/coaching/zen-savage">) {
  const sp = await props.searchParams;
  const hub = await loadCoachingHub(typeof sp.preview === "string" ? sp.preview : null);
  const now = Date.now();
  const upcoming = hub.lives.filter((l) => new Date(l.starts_at).getTime() + l.duration_minutes * 60000 > now);
  const replays = hub.lives.filter((l) => l.replay_url && new Date(l.starts_at).getTime() <= now).reverse();
  const draft = upcoming.find((l) => l.draft_note)?.draft_note;
  const unread = hub.messages.filter((m) => m.from_coach && !m.read_at).length;

  return (
    <div className="com-page co-page" style={{ gap: 0 }}>
      <CoachingSubNav unread={unread} />
      <div className="co-page" style={{ paddingBottom: 0 }}>
        <section className="co-zen-hero" aria-labelledby="zen-h">
          <Image src="/media/summit/summit-clouds.jpg" alt="" fill priority sizes="100vw" style={{ objectPosition: "50% 50%" }} />
          <div className="co-zen-body">
            <div className="lq-eyebrow" style={{ color: "#FFB58C" }}>Group coaching · live</div>
            <h1 id="zen-h" className="lq-d-xl">Zen Savage</h1>
            <p className="lq-lede">Grounded awareness and decisive action, together. One live call a week with Mike: breath, kettlebell, and the one thing you have been avoiding.</p>
          </div>
        </section>

        <section aria-labelledby="live-h">
          <header className="co-head">
            <div><div className="lq-eyebrow" data-tone="warm">Live schedule</div><h2 id="live-h" className="lq-d-md">Next lives</h2></div>
            {draft && <Chip variant="warm" size="sm" title={draft}>Draft schedule</Chip>}
          </header>
          {upcoming.length ? <LiveList lives={upcoming} /> : <div className="co-card co-empty"><b>No lives scheduled yet</b><p>Mike posts the next block of lives here. Turn on reminders when they appear.</p></div>}
        </section>

        {replays.length > 0 && (
          <section aria-labelledby="rep-h">
            <header className="co-head"><div><div className="lq-eyebrow" data-tone="accent">Replays</div><h2 id="rep-h" className="lq-d-md">Missed one? Watch it back</h2></div><span className="lq-t13 co-muted co-num">{replays.length}</span></header>
            <div className="co-replays">
              {replays.map((r) => (
                <a key={r.id} href={r.replay_url!} target="_blank" rel="noreferrer" className="co-card co-replay lq-press">
                  <div className="co-replay-photo">
                    {r.replay_thumb && <Image src={r.replay_thumb} alt="" fill sizes="(min-width: 1024px) 320px, 100vw" />}
                    <span className="co-play" aria-hidden><Icon name="play" size="sm" /></span>
                  </div>
                  <div className="co-replay-body"><h3>{r.title}</h3><span className="co-num">{day(r.starts_at)} · {r.duration_minutes} min</span></div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
