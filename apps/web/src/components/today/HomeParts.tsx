import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MovementFigure, StreakFlame } from "@/components/graphics";
import { Button, Chip, Glass, Icon, ProgressBar } from "@/components/ui";
import type { ActivityTile, ChecklistItem, HomeItem, HomeView, RetreatCardModel } from "./buildHome";
import { money } from "./buildHome";
import { JoinButton } from "./JoinButton";
import "./home.css";

/* ================================================================== artwork */

/** Program artwork with a designed fallback (movement figure on glass), never an empty box. */
export function Artwork({ item, ratio, sizes, priority, children }: { item: Pick<HomeItem, "image" | "glyph" | "name">; ratio: string; sizes: string; priority?: boolean; children?: ReactNode }) {
  return (
    <div className="w1-art" style={{ aspectRatio: ratio }}>
      {item.image ? (
        <Image src={item.image.src} alt="" fill sizes={sizes} priority={priority} />
      ) : (
        <span className="w1-art-glyph" aria-hidden>
          <MovementFigure move={item.glyph} size={96} animated={false} />
        </span>
      )}
      {children}
    </div>
  );
}

/* ================================================================== section header */

export function RowHead({ id, title, eyebrow, seeAll, seeAllLabel = "See all" }: { id: string; title: string; eyebrow?: string; seeAll?: string; seeAllLabel?: string }) {
  return (
    <div className="w1-rowhead">
      <div>
        {eyebrow && <p className="w1-eyebrow">{eyebrow}</p>}
        <h2 id={id} className="lq-t22">{title}</h2>
      </div>
      {seeAll && (
        <Link href={seeAll} className="w1-seeall lq-t15">
          {seeAllLabel} <Icon name="chevron" size="xs" />
        </Link>
      )}
    </div>
  );
}

/* ================================================================== cards */

export function Meter({ percent, tone = "accent" }: { percent: number; tone?: "accent" | "label" }) {
  return (
    <div className="w1-meter">
      <ProgressBar value={percent / 100} tone={tone} label={`${percent}% complete`} />
      <span className="lq-t13 lq-num">{percent}%</span>
    </div>
  );
}

/** A joined program: artwork, percent, what's next and the verb (legacy EnrolledProgramCard). */
export function EnrolledCard({ item, first }: { item: HomeItem; first?: boolean }) {
  return (
    <Link href={item.resumeHref} className="w1-cardlink" aria-label={`${item.verb.label} ${item.name}, ${item.percent}% complete`}>
      <Glass radius="card" interactive className="w1-card lq-lift">
        <Artwork item={item} ratio="16 / 9" sizes="272px" priority={first}>
          {item.complete && (
            <span className="w1-art-badge">
              <Chip variant="clear" icon="check">Completed</Chip>
            </span>
          )}
        </Artwork>
        <div className="w1-card-body">
          <p className="w1-kicker lq-t12 lq-c2 w1-clamp1">{item.kicker}</p>
          <p className="lq-t17 w1-clamp1">{item.name}</p>
          <Meter percent={item.percent} tone={first ? "accent" : "label"} />
          <p className="lq-t12 lq-c2 lq-num">{item.progressLabel}</p>
          {item.nextLabel && (
            <p className="lq-t13 w1-clamp1 w1-upnext">
              <span className="lq-c2">Up next · </span>
              {item.nextLabel}
            </p>
          )}
          <span className="w1-verb lq-t15">
            <Icon name={item.verb.icon} size="sm" /> {item.verb.label}
          </span>
        </div>
      </Glass>
    </Link>
  );
}

function accessWord(item: HomeItem) {
  if (item.draft) return "Draft";
  if (item.access === "free") return "Free";
  if (item.access === "owned") return "Owned";
  if (item.access === "included") return "Included";
  if (item.access === "preview") return "Preview";
  return "Locked";
}

/** A program not joined yet: artwork, size and a Join button, or Unlock · $price (legacy JoinProgramCard). */
export function JoinCard({ item }: { item: HomeItem }) {
  const locked = !(item.access === "included" || item.access === "owned" || item.access === "free");
  return (
    <Glass radius="card" className="w1-card w1-card-join lq-lift">
      <Link href={item.pageHref} className="w1-cardlink w1-join-art" aria-label={`${item.name}: details`}>
        <Artwork item={item} ratio="16 / 10" sizes="240px">
          {locked && (
            <span className="w1-art-badge">
              <Chip variant="clear" icon={item.draft ? "sparkle" : "lock"}>{item.draft ? "Draft" : "Locked"}</Chip>
            </span>
          )}
        </Artwork>
      </Link>
      <div className="w1-card-body">
        <p className="lq-t15 w1-clamp2 w1-name">{item.name}</p>
        <p className="lq-t12 lq-c2 w1-clamp1">
          {item.sizeLabel} · {accessWord(item)}
        </p>
        <div className="w1-card-cta">
          {!locked ? (
            <JoinButton programId={item.programId} pathId={item.pathId} name={item.name} block />
          ) : item.priceCents ? (
            <Button variant="glass" size="sm" block icon="lock" href={item.pageHref}>
              Unlock · {money(item.priceCents)}
            </Button>
          ) : (
            <Button variant="glass" size="sm" block iconAfter="chevron" href={item.pageHref}>
              {item.draft ? "Preview" : item.kicker === "Coaching" ? "Book a call" : "See details"}
            </Button>
          )}
        </div>
      </div>
    </Glass>
  );
}

export function RetreatCard({ r }: { r: RetreatCardModel }) {
  return (
    <Link href={r.href} className="w1-cardlink" aria-label={`${r.name}, ${r.line}`}>
      <Glass radius="card" interactive className="w1-card w1-retreat lq-lift" data-past={r.status === "past" ? "" : undefined}>
        <Artwork item={{ image: r.image, glyph: "walking", name: r.name }} ratio="16 / 10" sizes="272px">
          {r.statusLabel && (
            <span className="w1-art-badge">
              <Chip variant="clear" dot={r.status === "open"}>{r.statusLabel}</Chip>
            </span>
          )}
        </Artwork>
        <div className="w1-card-body">
          <p className="lq-t17 w1-clamp1">{r.name}</p>
          <p className="lq-t13 lq-c2 w1-clamp1">{r.line}</p>
        </div>
      </Glass>
    </Link>
  );
}

export function ActivityTiles({ tiles }: { tiles: ActivityTile[] }) {
  return (
    <div className="w1-tiles">
      {tiles.map((t) => (
        <Link key={t.id} href={t.href} className="w1-cardlink">
          <Glass radius="card" interactive className="w1-tile lq-lift" data-now={t.now ? "" : undefined}>
            <span className="w1-tile-icon" aria-hidden>
              <Icon name={t.icon} size="sm" />
            </span>
            <span className="w1-tile-text">
              <span className="w1-eyebrow">{t.eyebrow}</span>
              <span className="lq-t17 w1-clamp1">{t.title}</span>
              <span className="lq-t13 lq-c2 w1-clamp2">{t.line}</span>
            </span>
            <Icon name="chevron" size="sm" className="lq-c3 w1-tile-go" />
          </Glass>
        </Link>
      ))}
    </div>
  );
}

/* ================================================================== getting started (P2) */

export function Checklist({ items, done }: { items: ChecklistItem[]; done: number }) {
  const total = items.length;
  const next = items.filter((i) => !i.done);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <Glass as="section" radius="card" className="w1-check" aria-labelledby="gs-t">
      <div className="w1-check-head">
        <svg viewBox="0 0 56 56" className="w1-check-ring" aria-hidden>
          <circle cx="28" cy="28" r={r} className="w1-check-track" />
          <circle cx="28" cy="28" r={r} className="w1-check-fill" strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} />
        </svg>
        <div>
          <p className="w1-eyebrow">Getting started</p>
          <h2 id="gs-t" className="lq-t17">
            <span className="lq-num">{done}</span> of {total} done
          </h2>
        </div>
      </div>
      <ol className="w1-check-list">
        {items.map((i) => (
          <li key={i.id} data-done={i.done ? "" : undefined} data-next={i === next[0] ? "" : undefined}>
            {i.done ? (
              <span className="w1-check-row">
                <span className="w1-check-dot" aria-hidden>
                  <Icon name="check" size="xs" />
                </span>
                <span className="lq-t15 lq-c2">{i.doneLabel}</span>
              </span>
            ) : (
              <Link href={i.href} className="w1-check-row">
                <span className="w1-check-dot" aria-hidden />
                <span className="lq-t15">{i.label}</span>
                <Icon name="chevron" size="xs" className="lq-c3" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Glass>
  );
}

/* ================================================================== hero */

type Tod = "dawn" | "day" | "dusk" | "night";
export function timeOfDay(hour: number): Tod {
  return hour >= 5 && hour < 8 ? "dawn" : hour >= 8 && hour < 17 ? "day" : hour >= 17 && hour < 20 ? "dusk" : "night";
}

/** Living sky: the sun (or moon) sits on its arc for the member's local hour. */
function Sky({ hour }: { hour: number }) {
  const tod = timeOfDay(hour);
  // Day arc 6:00 → 20:00, night arc 20:00 → 6:00.
  const day = hour >= 6 && hour < 20;
  const t = day ? (hour - 6) / 14 : ((hour + 24 - 20) % 24) / 10;
  const a = Math.PI * (1 - t);
  const x = 100 + 84 * Math.cos(a);
  const y = 96 - 78 * Math.sin(a);
  return (
    <svg className="w1-sky" viewBox="0 0 200 104" aria-hidden data-tod={tod}>
      <path d="M16 96 A84 78 0 0 1 184 96" className="w1-sky-arc" />
      <line x1="8" y1="96" x2="192" y2="96" className="w1-sky-horizon" />
      <circle cx={x} cy={y} r="13" className="w1-sky-glow" />
      {day ? <circle cx={x} cy={y} r="6" className="w1-sky-sun" /> : <path d={`M${x + 2} ${y - 6} a6 6 0 1 0 4 10 a7 7 0 0 1 -4 -10z`} className="w1-sky-moon" />}
    </svg>
  );
}

function Journey({ sections, nextLabel }: { sections: NonNullable<HomeView["journey"]>; nextLabel: string | null }) {
  const total = sections.reduce((n, s) => n + s.total, 0);
  const current = sections.findIndex((s) => s.done < s.total);
  return (
    <div className="w1-journey" role="img" aria-label={`Journey: ${sections.map((s) => `${s.title} ${s.done} of ${s.total}`).join(", ")}`}>
      {sections.map((s, i) => (
        <div key={s.title} className="w1-jseg" style={{ flexGrow: s.total / total }} data-state={s.done >= s.total ? "done" : i === current ? "now" : "ahead"}>
          <div className="w1-jbar">
            <span style={{ width: `${(s.done / s.total) * 100}%` }} />
            {i === current && <i className="w1-jmark" style={{ left: `${(s.done / s.total) * 100}%` }} />}
          </div>
          <span className="lq-t12 w1-jlabel">{s.title.replace(/\s+phase$/i, "")}</span>
          {i === current && nextLabel && <span className="lq-t12 w1-jhere">You · {nextLabel.split(" · ")[0]}</span>}
        </div>
      ))}
    </div>
  );
}

export function HomeHero({ h, hour, streak, greeting }: { h: HomeView; hour: number; streak: number; greeting: string }) {
  const item = h.continuing ?? h.featured;
  if (!item) return null;
  const mode = h.continuing ? "continue" : "join";
  return (
    <section className="w1-hero" data-mode={mode} data-tod={timeOfDay(hour)} aria-labelledby="hero-t">
      <div className="w1-hero-media">
        {item.image ? (
          <Image src={item.image.src} alt="" fill priority sizes="(min-width: 1024px) 1100px, 100vw" />
        ) : (
          <span className="w1-art-glyph" aria-hidden>
            <MovementFigure move={item.glyph} size={220} />
          </span>
        )}
      </div>
      <div className="w1-hero-scrim" aria-hidden />
      <Sky hour={hour} />
      <div className="w1-hero-copy">
        <div className="w1-hero-top">
          <p className="w1-eyebrow">{mode === "continue" ? "Continue training" : h.settings.heroEyebrow || "Featured program"}</p>
          <span className="lq-t13 lq-c2 w1-hello">{greeting}</span>
        </div>
        <h1 id="hero-t" className="w1-hero-title">{item.name}</h1>
        {mode === "continue" ? (
          <>
            <div className="w1-hero-chips">
              {item.kicker && <Chip variant="glass">{item.kicker}</Chip>}
              {streak > 0 && (
                <Chip variant="glass">
                  <span className="w1-chip-in">
                    <StreakFlame size={14} lit animated={false} title="" /> <span className="lq-num">{`${streak}-day streak`}</span>
                  </span>
                </Chip>
              )}
              {h.readiness && (
                <Link href="/you" className="w1-chiplink" aria-label={`Last readiness ${h.readiness.score}, ${h.readiness.name ?? h.readiness.band}, ${h.readiness.when}`}>
                  <Chip variant="glass">
                    <span className="w1-chip-in">
                      <i className="w1-band" data-band={h.readiness.band} aria-hidden /> Readiness <span className="lq-num">{h.readiness.score}</span>
                      {h.readiness.trend.length > 1 && <Spark values={h.readiness.trend} />}
                    </span>
                  </Chip>
                </Link>
              )}
            </div>
            <div className="w1-hero-progress">
              <Meter percent={item.percent} />
              <p className="lq-t13 lq-c2 lq-num">{item.progressLabel}</p>
            </div>
            {item.nextLabel && !item.complete && (
              <p className="lq-t17 w1-hero-next">
                <span className="lq-c2">Up next · </span>
                {item.nextLabel}
              </p>
            )}
            <div className="w1-hero-actions">
              <Button icon={item.complete ? "repeat" : "play"} href={h.heroAction!.href}>
                {h.heroAction!.label}
              </Button>
              <Button variant="glass" href={item.pageHref} iconAfter="chevron">
                Program
              </Button>
            </div>
            {h.heroAction!.hint && <p className="lq-t13 lq-c2 w1-hero-hint">{h.heroAction!.hint}</p>}
          </>
        ) : (
          <>
            {item.summary && <p className="lq-t17 lq-c2 w1-hero-sum">{item.summary}</p>}
            <p className="lq-t13 lq-c2">{item.sizeLabel}</p>
            <div className="w1-hero-actions">
              <JoinButton programId={item.programId} pathId={item.pathId} name={item.name} variant="filled" size="lg" />
              <Button variant="glass" href={item.pageHref} iconAfter="chevron">
                Preview
              </Button>
            </div>
          </>
        )}
      </div>
      {mode === "continue" && h.journey && (
        <div className="w1-hero-journey">
          <Journey sections={h.journey} nextLabel={item.nextLabel} />
        </div>
      )}
    </section>
  );
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 40},${14 - ((v - min) / (max - min || 1)) * 12}`).join(" ");
  return (
    <svg viewBox="0 0 40 16" className="w1-spark" aria-hidden>
      <polyline points={pts} />
    </svg>
  );
}

/** Something else is on for today (live coaching, a plan session in another program). */
export function AlsoToday({ a }: { a: NonNullable<HomeView["alsoToday"]> }) {
  return (
    <Link href={a.href} className="w1-cardlink">
      <Glass radius="card" interactive className="w1-also lq-lift">
        <span className="w1-tile-icon" data-now="" aria-hidden>
          <Icon name="calendar" size="sm" />
        </span>
        <span className="w1-tile-text">
          <span className="w1-eyebrow">On your plan today · {a.eyebrow}</span>
          <span className="lq-t17 w1-clamp1">{a.title}</span>
        </span>
        <span className="lq-btn" data-variant="tint" data-size="sm" aria-hidden>
          <span>{a.cta}</span>
        </span>
      </Glass>
    </Link>
  );
}

export function EmptyEnrolled() {
  return (
    <Glass radius="card" className="w1-empty">
      <Icon name="kettlebell" className="lq-c2" />
      <p className="lq-t15 lq-c2">You haven&apos;t joined a program yet. Pick one below — your progress shows up here.</p>
    </Glass>
  );
}
