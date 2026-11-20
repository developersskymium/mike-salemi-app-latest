"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/ui";
import { enrollAction } from "@/lib/actions/training";

/**
 * Self-Guided is a separate way to train: opening the Self-Guided pages never changes the member's mode.
 * When this level is enrolled in Immersion (days open in order), say so and offer an explicit switch.
 * Until they switch, Immersion's day order still applies (days ahead can be viewed, not completed).
 */
export function SelfGuidedSync({ programId, pathId, slug, levelName }: { programId: string; pathId: string | null; slug: string; levelName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <div className="sgp-modebox" role="note">
      <p className="lq-t14">
        <b>{levelName} is set to Immersion</b> (day by day, in order). Self-Guided is a separate way to train: every day open, any order.
      </p>
      <button
        type="button"
        className="lq-btn" data-size="sm" data-variant="filled"
        aria-busy={pending || undefined}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await enrollAction(programId, pathId, "self_guided", slug);
            if (!r.ok) {
              if (r.code !== "offline") toast(r.message, { icon: "close" });
              return;
            }
            toast(`${levelName} is on Self-Guided now. Every day is open.`, { tone: "success", icon: "check" });
            router.refresh();
          })
        }
      >
        Train {levelName} Self-Guided
      </button>
    </div>
  );
}

/** "Switch to Immersion": actually switches the enrollment back (day by day, in order), then opens the Immersion page. */
export function SwitchToImmersion({ programId, pathId, slug, href, className, children }: { programId: string; pathId: string | null; slug: string; href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      aria-busy={pending || undefined}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await enrollAction(programId, pathId, "immersion", slug);
          if (!r.ok && r.code !== "offline") return void toast(r.message, { icon: "close" });
          if (r.ok) toast("Switched to Immersion. Days open in order.", { tone: "success", icon: "check" });
          router.push(href as never);
        })
      }
    >
      {children}
    </button>
  );
}
