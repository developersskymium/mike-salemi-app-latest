"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, Chip, Glass, Icon, Sheet, haptic, useToast } from "@/components/ui";
import { cancelCoachingAction, rescheduleCoachingAction, saveCoachingPrepAction } from "@/lib/actions/commerce";
import type { CoachingSessionView } from "@/lib/loaders/commerce";
import { SlotPicker, slotWhen, useMounted, type PickSlot } from "./SlotPicker";

function inWords(ms: number) {
  if (ms <= 0) return "now";
  const h = ms / 3600000;
  if (h < 1) return `in ${Math.max(1, Math.round(ms / 60000))} min`;
  if (h < 24) return `in ${Math.round(h)} hr${Math.round(h) === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return d === 1 ? "tomorrow" : `in ${d} days`;
}

/** The next session: when, join, prep (goals + footage link), move or cancel with the 24-hour rule. */
export function SessionCard({ s, slots, primary }: { s: CoachingSessionView; slots: PickSlot[]; primary?: boolean }) {
  const mounted = useMounted();
  const router = useRouter();
  const toast = useToast();
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const [goals, setGoals] = useState(s.prep?.goals ?? s.member_note ?? "");
  const [footage, setFootage] = useState(s.prep?.footage_url ?? "");
  const [savedAt, setSavedAt] = useState<boolean>(Boolean(s.prep));
  const [sheet, setSheet] = useState<"move" | "cancel" | null>(null);
  const [pick, setPick] = useState<PickSlot | null>(null);
  const [pending, start] = useTransition();
  const startMs = new Date(s.starts_at).getTime();
  const live = mounted && now >= startMs - 10 * 60000 && now < startMs + s.duration_minutes * 60000;
  const movable = mounted && startMs - now >= 24 * 3600000;

  const save = () =>
    start(async () => {
      const r = await saveCoachingPrepAction(s.id, goals, footage);
      if (r.ok) {
        haptic();
        setSavedAt(true);
        toast("Prep saved · Mike sees it before the call", { tone: "success", icon: "check" });
      } else toast(r.message, { icon: "close" });
    });
  const move = () =>
    start(async () => {
      if (!pick) return;
      const r = await rescheduleCoachingAction(s.id, pick.id);
      if (r.ok) {
        toast("Session moved", { tone: "success", icon: "check" });
        setSheet(null);
        router.refresh();
      } else toast(r.message, { icon: "close" });
    });
  const cancel = () =>
    start(async () => {
      const r = await cancelCoachingAction(s.id);
      if (r.ok) {
        toast(r.data.creditReturned ? "Cancelled · session returned to you" : "Cancelled", { icon: "check" });
        setSheet(null);
        router.refresh();
      } else toast(r.message, { icon: "close" });
    });

  return (
    <Glass radius="card" className="ch-session" data-primary={primary ? "" : undefined}>
      <div className="ch-session-top">
        <div className="ch-date" aria-hidden>
          <span>{mounted ? slotWhen(s.starts_at, { weekday: "short" }) : ""}</span>
          <b className="lq-num">{mounted ? slotWhen(s.starts_at, { day: "numeric" }) : ""}</b>
          <span>{mounted ? slotWhen(s.starts_at, { month: "short" }) : ""}</span>
        </div>
        <div className="com-grow">
          <div className="ch-session-when">
            <span className="lq-d-xs">{mounted ? slotWhen(s.starts_at, { weekday: "long", hour: "numeric", minute: "2-digit" }) : " "}</span>
            {mounted && (live ? <Chip variant="warm" dot size="sm">Live now</Chip> : <Chip variant="fill" size="sm">{inWords(startMs - now)}</Chip>)}
          </div>
          <div className="lq-t13 lq-c2">{s.duration_minutes} min video call with Mike{s.package ? ` · ${s.package}` : ""}</div>
          <div className="ch-session-acts">
            {s.meeting_url ? (
              <Button size="md" variant={live ? "filled" : "glass"} icon="video" href={s.meeting_url} target="_blank">{live ? "Join call now" : "Join link"}</Button>
            ) : (
              <span className="lq-t13 lq-c3 ch-ic"><Icon name="video" size="xs" /> The video link arrives before the call</span>
            )}
            <Button size="md" variant="plain" icon="calendar" onClick={() => { setPick(null); setSheet("move"); }} disabled={!movable}>Move</Button>
            <Button size="md" variant="plain" onClick={() => setSheet("cancel")}>Cancel</Button>
          </div>
        </div>
      </div>

      {primary && (
        <div className="ch-prep">
          <div className="ch-prep-head">
            <div>
              <div className="lq-eyebrow" data-tone="warm">Prepare · 5 minutes</div>
              <div className="lq-t17" style={{ fontWeight: 600 }}>Help Mike get straight to it</div>
            </div>
            {savedAt && <Chip variant="ok" size="sm" icon="check">Shared with Mike</Chip>}
          </div>
          <div className="ch-prep-grid">
            <label className="ch-field">
              <span>Your goals for this session</span>
              <textarea className="com-input" rows={4} maxLength={2000} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="My snatch loses the lockout past rep 15, and I want a plan for the next four weeks." />
            </label>
            <label className="ch-field">
              <span>Link to your training footage <i>optional</i></span>
              <input className="com-input" inputMode="url" value={footage} onChange={(e) => setFootage(e.target.value)} placeholder="https://drive.google.com/… or YouTube (unlisted)" />
              <span className="lq-t12 lq-c3">Film from the side, full body, a few working reps. Upload to Google Drive, Dropbox or unlisted YouTube and paste the link.</span>
              <Button size="md" variant="filled" icon="check" onClick={save} disabled={pending} aria-busy={pending} className="ch-prep-save">{pending ? "Saving…" : "Save prep"}</Button>
            </label>
          </div>
        </div>
      )}

      <p className="ch-rule"><Icon name="info" size="xs" /> Move or cancel up to 24 hours before and the session comes back to you. Inside 24 hours it counts as used.</p>

      <Sheet
        open={sheet === "move"}
        onClose={() => setSheet(null)}
        title="Move this session"
        description={mounted ? `Now ${slotWhen(s.starts_at)}. Pick a new time; your session stays the same.` : undefined}
        footer={<Button block size="lg" onClick={move} disabled={!pick || pending} aria-busy={pending}>{pending ? "Moving…" : pick && mounted ? `Move to ${slotWhen(pick.starts_at)}` : "Pick a new time"}</Button>}
      >
        <SlotPicker slots={slots} value={pick?.id ?? null} onChange={setPick} />
      </Sheet>
      <Sheet
        open={sheet === "cancel"}
        onClose={() => setSheet(null)}
        title="Cancel this session?"
        detents={["medium"]}
        description={s.can_cancel_with_refund ? "It’s more than 24 hours away, so the session comes back to you to book again." : "It’s less than 24 hours away, so the session won’t come back."}
        footer={
          <div className="com-stack" style={{ gap: 8 }}>
            <Button block variant="glass" onClick={cancel} disabled={pending} aria-busy={pending}>{pending ? "Cancelling…" : "Cancel session"}</Button>
            <Button block variant="plain" onClick={() => setSheet(null)}>Keep it</Button>
          </div>
        }
      />
    </Glass>
  );
}
