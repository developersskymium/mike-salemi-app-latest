"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Icon, haptic, useToast } from "@/components/ui";
import { bookRunCallAction } from "@/lib/actions/commerce";
import { SlotPicker, slotWhen, useMounted, type PickSlot } from "./SlotPicker";

/** Step 2: pick (or move) the alignment call with Mike's team. */
export function CallPicker({ runId, slots, callAt, callUrl }: { runId: string; slots: PickSlot[]; callAt: string | null; callUrl: string | null }) {
  const mounted = useMounted();
  const router = useRouter();
  const toast = useToast();
  const [booked, setBooked] = useState<string | null>(callAt);
  const [changing, setChanging] = useState(!callAt);
  const [pick, setPick] = useState<PickSlot | null>(null);
  const [pending, start] = useTransition();

  const confirm = () =>
    start(async () => {
      if (!pick) return;
      const r = await bookRunCallAction(runId, pick.id);
      if (r.ok) {
        haptic(14);
        setBooked(r.data.callAt);
        setChanging(false);
        setPick(null);
        toast("Call booked", { tone: "success", icon: "check" });
        router.refresh();
      } else toast(r.message, { icon: "close" });
    });

  if (booked && !changing) {
    return (
      <div className="rt-callbooked">
        <span className="rt-callbooked-date" aria-hidden>
          <span>{mounted ? slotWhen(booked, { month: "short" }) : ""}</span>
          <b className="lq-num">{mounted ? slotWhen(booked, { day: "numeric" }) : ""}</b>
        </span>
        <div className="com-grow">
          <div className="lq-t15" style={{ fontWeight: 650 }}>{mounted ? slotWhen(booked, { weekday: "long", hour: "numeric", minute: "2-digit" }) : " "}</div>
          <div className="lq-t13 lq-c2">Video call with Mike&rsquo;s team · up to 45 min</div>
          <div className="rt-callbooked-acts">
            {callUrl ? <Button size="sm" variant="filled" icon="video" href={callUrl} target="_blank">Join call</Button> : <span className="lq-t12 lq-c3">The link arrives before the call</span>}
            <Button size="sm" variant="plain" onClick={() => setChanging(true)}>Change time</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rt-callpick">
      <SlotPicker slots={slots} value={pick?.id ?? null} onChange={setPick} maxDays={6} label="Call time" durationLabel="up to 45 minutes" />
      <Button block size="lg" variant="filled" icon={pending ? undefined : "calendarCheck"} onClick={confirm} disabled={!pick || pending} aria-busy={pending}>
        {pending ? "Booking…" : pick && mounted ? `Book ${slotWhen(pick.starts_at, { weekday: "short", hour: "numeric", minute: "2-digit" })}` : "Pick a time above"}
      </Button>
      {booked && (
        <Button block size="sm" variant="plain" onClick={() => setChanging(false)}>
          <Icon name="close" size="xs" /> Keep {mounted ? slotWhen(booked) : "my time"}
        </Button>
      )}
    </div>
  );
}
