"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, useToast } from "@/components/ui";
import { librarySessionAction } from "@/lib/actions/selfguided";

/** Library: "Do this as a session" for any video. Logs minutes and appears in history. */
export function DoAsSession({ videoId, programSlug, size = "md" }: { videoId: string; programSlug: string; size?: "sm" | "md" | "lg" }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      size={size}
      variant="glass"
      icon="timer"
      aria-busy={pending || undefined}
      onClick={() =>
        start(async () => {
          const r = await librarySessionAction(videoId);
          if (!r.ok) return toast(r.message);
          router.push(`/programs/${programSlug}/session/${r.sessionId}`);
        })
      }
    >
      Do this as a session
    </Button>
  );
}
