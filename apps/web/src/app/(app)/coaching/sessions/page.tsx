import type { Metadata } from "next";
import { Button, Chip, Icon } from "@/components/ui";
import { CoachingSubNav } from "@/components/coaching/SubNav";
import { HomeworkWeek } from "@/components/coaching/HomeworkWeek";
import { SessionCard } from "@/components/experiences/SessionCard";
import { currentHomework, loadCoachingHub } from "@/lib/loaders/coaching";
import "@/components/commerce/commerce.css";
import "@/components/experiences/experiences.css";
import "@/components/experiences/retreat.css";
import "@/components/experiences/coaching.css";
import "@/components/coaching/coach.css";

export const metadata: Metadata = { title: "Sessions · Coaching" };

const when = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
const STATUS: Record<string, string> = { completed: "Done", cancelled: "Cancelled", no_show: "Missed", booked: "Booked" };

/** Idea 6 · Coaching timeline: every call, with your prep, Mike's notes, homework and how it went. */
export default async function SessionsPage(props: PageProps<"/coaching/sessions">) {
  const sp = await props.searchParams;
  const preview = typeof sp.preview === "string" ? sp.preview : null;
  const q = preview ? `?preview=${preview}` : "";
  const hub = await loadCoachingHub(preview);
  const hw = currentHomework(hub);
  const unread = hub.messages.filter((m) => m.from_coach && !m.read_at).length;
  const done = hub.past.filter((s) => s.status === "completed").length;

  return (
    <div className="com-page co-page" style={{ gap: 0 }}>
      <CoachingSubNav unread={unread} />
      <header className="co-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="lq-eyebrow" data-tone="accent">Your coaching timeline</div>
          <h1 className="lq-d-lg" style={{ margin: 0 }}>{done ? `${done} call${done === 1 ? "" : "s"} with Mike` : "Your calls with Mike"}</h1>
        </div>
        <Button href={`/coaching/book${q}`} size="md" icon="calendar" variant={hub.upcoming.length ? "secondary" : "filled"}>Book a call</Button>
      </header>

      {!hub.upcoming.length && !hub.past.length ? (
        <div className="co-card co-empty">
          <Icon name="route" size="md" />
          <b>Your timeline starts with your first call</b>
          <p>Every call, Mike&rsquo;s notes and your homework collect here, in order.</p>
          <Button href={`/coaching/book${q}`} size="md">Book a Tuesday call</Button>
        </div>
      ) : (
        <ol className="co-tl" role="list">
          {hub.upcoming.length > 0 && <li className="co-tl-group" style={{ padding: "0 0 14px 46px" }}>Coming up</li>}
          {hub.upcoming.map((s) => (
            <li key={s.id} id={s.id} data-status="booked">
              <span className="co-node" aria-hidden />
              <SessionCard s={s} slots={hub.slots} />
              <div style={{ marginTop: 10 }}>
                <Button href={`/coaching/prep/${s.id}${q}`} size="sm" variant={s.prep?.goals ? "plain" : "tint"} icon={s.prep?.goals ? "check" : "clipboard"}>{s.prep?.goals ? "Prep shared · edit" : "Answer 3 questions before the call"}</Button>
              </div>
            </li>
          ))}
          {hub.past.length > 0 && <li className="co-tl-group" style={{ padding: "8px 0 14px 46px" }}>Before</li>}
          {hub.past.map((s) => {
            const ticks = (hub.ticks[s.id] ?? []).length;
            return (
              <li key={s.id} id={s.id} data-status={s.status}>
                <span className="co-node" aria-hidden />
                <article className="co-card co-tl-card">
                  <div className="co-tl-top">
                    <div><b className="co-num">{when(s.starts_at)}</b><div className="lq-t13 co-muted">{s.package ?? "Session"} · {s.duration_minutes} min</div></div>
                    <Chip variant={s.status === "completed" ? "ok" : "outline"} size="sm">{STATUS[s.status] ?? s.status}</Chip>
                  </div>
                  {(s.prep?.goals || s.member_note) && <p className="lq-t13 co-muted" style={{ margin: 0 }}><span className="co-faint">You brought · </span>{s.prep?.goals ?? s.member_note}</p>}
                  {s.coach_note && <div className="co-note"><span className="co-k">Mike&rsquo;s notes</span><p>{s.coach_note}</p></div>}
                  {!s.coach_note && s.status === "completed" && <p className="lq-t13 co-faint" style={{ margin: 0 }}>Mike&rsquo;s notes appear here after the call.</p>}
                  {s.homework && (
                    <div className="co-hwrow">
                      <Icon name="flag" size="sm" />
                      <div style={{ flex: 1 }}>
                        <span className="co-k">Your one thing</span>
                        <p>{s.homework}</p>
                        {hw?.id === s.id ? (
                          <div style={{ marginTop: 10 }}><HomeworkWeek compact bookingId={s.id} homework={s.homework} from={s.starts_at} ticked={hub.ticks[s.id] ?? []} /></div>
                        ) : (
                          <span className="lq-t12 co-muted">{ticks ? `Done on ${ticks} day${ticks === 1 ? "" : "s"}` : "No days ticked"}</span>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
