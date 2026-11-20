"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";
import { useShellUser } from "./ShellUser";

const noop = () => () => {};

function greetingNow() {
  const h = new Date().getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
function dateNow() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

/** "Good morning, Daniel" in the member's own time (the server renders a neutral hello). */
export function useGreeting() {
  const user = useShellUser();
  const first = (user?.name ?? "").split(/\s+/)[0] || "there";
  const g = useSyncExternalStore(noop, greetingNow, () => "Welcome back");
  const d = useSyncExternalStore(noop, dateNow, () => "");
  return { text: `${g}, ${first}`, date: d };
}

/** Search lessons and moves (⌘K / Ctrl K focuses it); submits to the Library search. */
export function TopSearch() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form
      role="search"
      className="sm-search"
      action="/library"
      onSubmit={(e) => {
        e.preventDefault();
        const q = input.current?.value.trim() ?? "";
        router.push(q ? `/library?q=${encodeURIComponent(q)}` : "/library");
      }}
    >
      <Icon name="search" size="sm" />
      <input ref={input} name="q" type="search" placeholder="Search lessons and moves" aria-label="Search lessons and moves" autoComplete="off" onFocus={() => router.prefetch("/library")} />
      <kbd aria-hidden>⌘K</kbd>
    </form>
  );
}

/** Desktop top bar: the member, greeting and date; search, streak, notifications. */
export function TopBar({ streak }: { streak?: ReactNode }) {
  const user = useShellUser();
  const { text, date } = useGreeting();
  return (
    <div className="sm-topbar">
      {user && <Avatar name={user.name} src={user.avatarUrl} size="sm" />}
      <span className="sm-greet">{text}</span>
      {date && <span className="sm-date">· {date}</span>}
      <div className="sm-topbar-r">
        <TopSearch />
        {streak}
        <Link href="/you/notifications" className="lq-iconbtn lq-glass lq-press" aria-label="Notifications" title="Notifications" prefetch>
          <Icon name="bell" />
        </Link>
      </div>
    </div>
  );
}

/** Phone header: bell mark, date over the greeting, streak, avatar. */
export function PhoneHeader({ streak, mark }: { streak?: ReactNode; mark: ReactNode }) {
  const user = useShellUser();
  const { text, date } = useGreeting();
  return (
    <div className="sm-phead">
      {mark}
      <span className="sm-phead-t">
        <span className="sm-phead-d">{date || " "}</span>
        <b className="sm-phead-g">{text}</b>
      </span>
      {streak}
      {user && (
        <Link href="/you" className="lq-press sm-phead-av" aria-label="Profile" prefetch>
          <Avatar name={user.name} src={user.avatarUrl} size="md" />
        </Link>
      )}
    </div>
  );
}
