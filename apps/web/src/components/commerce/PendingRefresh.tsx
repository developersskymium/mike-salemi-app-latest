"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ProgressBar } from "@/components/ui";

/** While Stripe's webhook confirms the order, re-check every 2s for up to 30s. */
export function PendingRefresh() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  const max = 15;
  useEffect(() => {
    if (tries >= max) return;
    const t = window.setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [tries, router]);
  return tries < max ? (
    <div style={{ width: "100%", marginTop: 8 }} aria-live="polite">
      <ProgressBar value={(tries + 1) / max} tone="accent" label="Confirming payment" />
      <p className="lq-t13 lq-c2" style={{ marginTop: 8 }}>This usually takes a few seconds.</p>
    </div>
  ) : (
    <div style={{ width: "100%" }}>
      <p className="lq-t13 lq-c2">It&rsquo;s taking longer than usual. Your payment is safe; access appears as soon as it&rsquo;s confirmed.</p>
      <Button block variant="glass" icon="repeat" onClick={() => setTries(0)} style={{ marginTop: 12 }}>Check again</Button>
    </div>
  );
}
