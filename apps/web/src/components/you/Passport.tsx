import Link from "next/link";
import { LevelEmblem, StreakFlame } from "@/components/graphics";
import { Avatar, Glass, Icon, ProgressBar, Rings, Ticker } from "@/components/ui";
import { WeekDots, type WeekDot } from "@/components/signature";
import type { PassportData } from "@/lib/loaders/you";
import { fmtMonth, levelShort, passportNo, splitDay } from "./format";

/**
 * Signature: the training passport. Legacy account header (identity + program ring, four mini stats,
 * XP bar) set as a passport data page: guilloche field and passport number. (The machine-readable
 * line read as broken text to members and was dropped, D24.)
 */
export function PassportHeader({ d }: { d: PassportData }) {
  const r = d.rewards;
  const active = [...d.enrollments].filter((e) => !e.completed_at).sort((a, b) => (b.last_active_at ?? "").localeCompare(a.last_active_at ?? ""))[0] ?? d.enrollments[0];
  const pct = active && active.lessons_total ? active.lessons_done / active.lessons_total : 0;
  const base = (r.level - 1) * 1000;
  const toNext = r.next_level_at - r.points_total;
  const cur = active?.current_lesson_title ? splitDay(active.current_lesson_title) : null;
  const minutes = d.stats.minutes;
  const week = thisWeek(d.stats.today, new Set(d.stats.heatmap.map((h) => h.date)));
  const ready = d.stats.readiness.at(-1) ?? null;
  const BAND: Record<string, string> = { green: "ok", amber: "warm", red: "warm" };

  return (
    <Glass as="section" level="thick" className="yu-passport" aria-label="Training passport">
      <svg className="yu-guilloche" viewBox="0 0 600 260" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {Array.from({ length: 18 }, (_, i) => (
          <path
            key={i}
            d={`M-20 ${130 + Math.sin(i) * 6} C 120 ${40 + i * 6}, 220 ${220 - i * 5}, 320 ${120 + i * 2} S 520 ${30 + i * 9}, 640 ${140 - i * 3}`}
          />
        ))}
        <circle cx="520" cy="70" r="120" />
        <circle cx="520" cy="70" r="96" />
        <circle cx="520" cy="70" r="72" />
      </svg>

      <div className="yu-pp-top">
        <div className="yu-pp-id">
          <div className="yu-pp-photo">
            <Avatar name={d.profile.displayName} src={d.profile.avatarUrl} size="xl" variant="glass" />
          </div>
          <div className="yu-pp-who">
            <p className="lq-t13 yu-eyebrow">Training passport · <span className="lq-num">{passportNo(d.profile.id)}</span></p>
            <h1 className="yu-pp-name">{d.profile.displayName}</h1>
            <p className="lq-t13 lq-c2 yu-pp-meta">
              <Icon name="you" size="xs" /> {d.profile.email}
            </p>
            <p className="lq-t13 lq-c2 yu-pp-meta">
              Issued {fmtMonth(d.profile.createdAt)}
              {active?.path_name ? ` · ${active.program_name}, ${levelShort(active.path_name)}` : ""}
            </p>
          </div>
        </div>
        <Link href={active ? `/programs/${active.program_slug}` : "/programs"} className="yu-pp-ring" aria-label={`Program ${Math.round(pct * 100)}% complete`}>
          <Rings size={112} stroke={9} rings={[{ value: pct, tone: 1 }]}>
            <span className="yu-pp-ring-in">
              <b className="lq-num">{Math.round(pct * 100)}%</b>
              <small>Program</small>
            </span>
          </Rings>
        </Link>
      </div>

      <dl className="yu-ministats">
        <div>
          <dt><Icon name="calendar" size="xs" /> Days</dt>
          <dd className="lq-num">{active ? `${active.lessons_done}/${active.lessons_total}` : "0"}</dd>
        </div>
        <div>
          <dt><Icon name="clock" size="xs" /> {minutes ? "Trained" : "Active days"}</dt>
          <dd className="lq-num">{minutes ? <><Ticker value={minutes} /><small> min</small></> : <Ticker value={d.stats.heatmap.length} />}</dd>
        </div>
        <div>
          <dt><StreakFlame size={13} lit={r.streak_current > 0} title="" /> Streak</dt>
          <dd className="lq-num"><Ticker value={r.streak_current} /><small>d</small></dd>
        </div>
        <div>
          <dt><Icon name="steps" size="xs" /> Current</dt>
          <dd className="yu-ms-cur">
            {cur?.day ? <span className="lq-num">Day {cur.day}</span> : <span>{active ? "—" : "Not started"}</span>}
            {cur && <small>{cur.title}</small>}
          </dd>
        </div>
      </dl>

      <div className="yu-pp-week">
        <div className="yu-pp-weekdots">
          <span className="lq-eyebrow" data-tone="warm">This week</span>
          <WeekDots days={week} size="sm" />
        </div>
        <div className="yu-pp-facts">
          <span className="yu-pp-fact">
            <small className="lq-t12 lq-c2">Best streak</small>
            <b className="lq-num">{d.stats.streak.best || r.streak_current} days</b>
          </span>
          <span className="yu-pp-fact">
            <small className="lq-t12 lq-c2">Readiness</small>
            {ready ? (
              <b className="yu-pp-ready" data-tone={BAND[ready.band] ?? "ok"}><i aria-hidden />{ready.band_name}</b>
            ) : (
              <Link href="/tools/stretch-test" className="lq-t13 yu-pp-link">Stretch Test</Link>
            )}
          </span>
          <span className="yu-pp-fact">
            <small className="lq-t12 lq-c2">Sessions</small>
            <b className="lq-num">{d.stats.sessions || d.stats.active_days}</b>
          </span>
        </div>
      </div>

      <Link href="/you/rewards" className="yu-xp" aria-label={`Level ${r.level}, ${r.level_name}. ${toNext} points to level ${r.level + 1}.`}>
        <LevelEmblem level={r.level} size={44} />
        <span className="yu-xp-main">
          <span className="yu-xp-line">
            <b>Level {r.level} · {r.level_name}</b>
            <span className="lq-t13 lq-c2 lq-num"><Ticker value={r.points_total} /> pts · {toNext.toLocaleString("en-GB")} to Level {r.level + 1}</span>
          </span>
          <ProgressBar value={(r.points_total - base) / 1000} tone="warm" label="Points to next level" />
        </span>
        <Icon name="chevron" size="sm" className="lq-c3" />
      </Link>

    </Glass>
  );
}

/** Monday-first dots for the current week: done = any training that day. */
function thisWeek(today: string, trained: Set<string>): WeekDot[] {
  const t = Date.parse(`${today}T00:00:00Z`);
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => {
    const date = new Date(t + (i - dow) * 864e5).toISOString().slice(0, 10);
    const state: WeekDot["state"] = trained.has(date) ? "done" : i === dow ? "today" : i < dow ? "rest" : "ahead";
    return { label, state, date: Number(date.slice(8)) };
  });
}
