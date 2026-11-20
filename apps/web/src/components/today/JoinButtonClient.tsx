"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, useToast, type ButtonVariant } from "@/components/ui";
import { joinProgramAction } from "@/lib/actions/home";

/** One-tap Join (legacy useJoinAndOpen): enrol, toast "You've joined X", open the first lesson. */
export function JoinButtonClient({
  programId,
  pathId,
  name,
  variant = "fill",
  size = "sm",
  block,
  label = "Join program",
}: {
  programId: string;
  pathId: string | null;
  name: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      block={block}
      icon={pending ? undefined : "plus"}
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={`${label}: ${name}`}
      onClick={() =>
        start(async () => {
          const res = await joinProgramAction(programId, pathId);
          if (!res.ok) {
            toast(res.error);
            return;
          }
          toast(`You've joined ${res.name}`, { tone: "success", icon: "check" });
          router.push(res.href);
        })
      }
    >
      {pending ? <span className="w1-spin" aria-hidden /> : null}
      {pending ? "Joining…" : label}
    </Button>
  );
}
