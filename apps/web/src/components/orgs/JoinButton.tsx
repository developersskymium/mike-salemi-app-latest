"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Icon } from "@/components/ui";
import { joinOrgAction } from "@/lib/actions/commerce";

export function JoinButton({ token, kind }: { token: string; kind: "invite" | "link" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const join = () =>
    start(async () => {
      setError(null);
      const r = await joinOrgAction(token, kind);
      if (r.ok) {
        setDone(true);
        window.setTimeout(() => router.push("/you/organization"), 900);
      } else setError(r.message);
    });
  return (
    <div style={{ width: "100%" }}>
      <Button block onClick={join} disabled={pending || done} aria-busy={pending} state={done ? "success" : "idle"} icon={done ? undefined : "people"}>
        {done ? "You’re in" : pending ? "Joining…" : "Join"}
      </Button>
      <div aria-live="polite">{error && <p className="com-error com-checkout-note" role="alert"><Icon name="close" size="xs" /> {error}</p>}</div>
    </div>
  );
}
