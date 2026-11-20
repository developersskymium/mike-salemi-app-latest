import Link from "next/link";
import { Avatar, Icon } from "@/components/ui";
import type { PassportData } from "@/lib/loaders/you";
import "./you-calm.css";

/** You header in one line: photo, name, training since, sessions, streak. */
export function YouHeader({ d }: { d: PassportData }) {
  const since = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(d.profile.createdAt));
  const sessions = d.stats.sessions || d.stats.active_days;
  const streak = d.rewards.streak_current;
  return (
    <header className="yc-head">
      <Avatar name={d.profile.displayName} src={d.profile.avatarUrl} size="xl" />
      <div className="yc-head-b">
        <h1 className="lq-d-md">{d.profile.displayName}</h1>
        <p className="lq-t15 lq-c2">
          <span>Training since {since}</span>
          <span aria-hidden>·</span>
          <span>
            <b className="lq-num">{sessions}</b> {sessions === 1 ? "session" : "sessions"}
          </span>
          <span aria-hidden>·</span>
          <span className="yc-nowrap">
            <Icon name="flame" size="xs" className="yc-flame" /> <b className="lq-num">{streak}</b>-day streak
          </span>
        </p>
      </div>
      <Link href="/you/settings" className="yc-head-set" aria-label="Settings">
        <Icon name="settings" size="sm" />
      </Link>
    </header>
  );
}
