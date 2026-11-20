"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { useToast } from "@/components/ui";
import { enrollAction } from "@/lib/actions/training";

/**
 * Opening Self-Guided while the level is enrolled in Immersion: switch the enrollment to Self-Guided.
 * Without this the database keeps Immersion's day lock, so days ahead could be opened but not completed
 * ("This day is still locked"). Progress is kept; Immersion is one tap back ("Switch to Immersion").
 */
export function SelfGuidedSync({ programId, pathId, slug, levelName }: { programId: string; pathId: string | null; slug: string; levelName: string }) {
  const router = useRouter();
  const toast = useToast();
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    void enrollAction(programId, pathId, "self_guided", slug).then((r) => {
      if (r.ok) {
        toast(`You're on Self-Guided now. Every day of ${levelName} is open.`, { tone: "success", icon: "check" });
        router.refresh();
      } else if (r.code !== "offline") toast(r.message, { icon: "close" });
    });
  }, [programId, pathId, slug, levelName, router, toast]);
  return null;
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
