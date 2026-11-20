"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ctaFor, type ProgramAccess } from "@ms/api";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { Button, cx, useToast, type ButtonVariant } from "@/components/ui";
import { startProgramAction } from "@/lib/actions/access";
import "./access.css";

type Props = {
  access: ProgramAccess | null;
  program: { id: string; slug: string; name: string };
  pathId?: string | null;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  /** Show the small line under the button ("Or included in Max"). */
  showNote?: boolean;
  /** Overrides the start label (legacy JoinButton `label`), only for start states. */
  startLabel?: string;
  className?: string;
};

/**
 * The one state-aware action for a program (spec 11):
 * Start / Continue · Included in your plan — Start · Upgrade to <Plan> · Buy — $X · Free — Start · Apply.
 * Start re-checks access on the server, then enrolls and opens the first lesson.
 */
export function ProgramCta({ access, program, pathId = null, variant = "filled", size = "md", block, showNote = true, startLabel, className }: Props) {
  const cta = ctaFor(access);
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const note = showNote && cta.note ? <span className="ac-note lq-t12 lq-c2">{cta.note}</span> : null;

  let el: React.ReactNode;
  if (cta.kind === "continue") {
    el = (
      <Link href={`/programs/${program.slug}`} prefetch className="lq-btn lq-fx lq-press" data-variant={variant === "filled" ? "warm" : variant} data-size={size} data-block={block ? "" : undefined} data-fx="">
        <span>Continue</span>
      </Link>
    );
  } else if (cta.kind === "start") {
    el = (
      <Button
        variant={variant}
        size={size}
        block={block}
        icon={pending ? undefined : "play"}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-label={`${startLabel ?? cta.label}: ${program.name}`}
        onClick={() =>
          start(async () => {
            const res = await startProgramAction(program.id, pathId);
            if (!res.ok) {
              toast(res.error);
              if (res.href) router.push(res.href);
              return;
            }
            toast(`You've started ${res.name}`, { tone: "success", icon: "check" });
            router.push(res.href);
          })
        }
      >
        {pending ? "Starting…" : startLabel && cta.label === "Start" ? startLabel : cta.label}
      </Button>
    );
  } else if (cta.kind === "buy") {
    el = <CheckoutButton kind="program" refId={program.slug} label={cta.label} variant={variant} size={size} block={block} />;
  } else if (cta.kind === "upgrade") {
    el = <CheckoutButton kind="plan" refId={access?.upgradePlanId ?? "pro"} interval="month" label={cta.label} variant={variant} size={size} block={block} />;
  } else if (cta.kind === "apply") {
    el = (
      <Link href={`/experiences/programs/${program.slug}`} prefetch className="lq-btn lq-fx lq-press" data-variant={variant} data-size={size} data-block={block ? "" : undefined} data-fx="">
        <span>Apply</span>
      </Link>
    );
  } else {
    el = (
      <Button variant="fill" size={size} block={block} disabled>
        {cta.label}
      </Button>
    );
  }
  return (
    <div className={cx("ac-cta", block && "ac-cta-block", className)} data-state={access?.state ?? "unknown"}>
      {el}
      {note}
    </div>
  );
}
