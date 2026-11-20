"use client";

import { useEffect, useState } from "react";
import { Button, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { permissionState, subscribePush, type PermissionState } from "./push-client";

/** "This device" row: asks the browser for permission, registers the service worker and subscribes. */
export function PushRow({ pushKey, enabled, onDisable }: { pushKey: string | null; enabled: boolean; onDisable: () => void }) {
  const [state, setState] = useState<PermissionState>("default");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => setState(permissionState()), []);
  if (state === "unsupported") {
    return (
      <div className="ntf-row">
        <div className="ntf-row-main"><span className="ntf-row-label">This device</span><span className="ntf-row-hint">This browser can't show notifications. Install the app or use Chrome, Edge, Firefox or Safari.</span></div>
      </div>
    );
  }
  const enable = async () => {
    setBusy(true);
    try {
      const p = await Notification.requestPermission();
      setState(p as PermissionState);
      if (p !== "granted") return void toast("Notifications are blocked for this site", { icon: "close" });
      const r = await subscribePush(pushKey);
      haptic(12);
      if (r === "subscribed") toast("Reminders will reach this device", { tone: "success", icon: "check" });
      else if (r === "no-key") toast("Allowed. Push delivery switches on soon — you'll get in-app reminders meanwhile.", { icon: "bell", duration: 5000 });
      else toast("Couldn't subscribe this device", { icon: "close" });
    } finally {
      setBusy(false);
    }
  };
  const hint =
    state === "granted"
      ? enabled
        ? pushKey ? "Reminders appear even when the app is closed" : "Allowed — push delivery switches on soon"
        : "Allowed in this browser, off for reminders"
      : state === "denied"
        ? "Blocked in your browser settings"
        : "Get reminders outside the app";
  return (
    <div className="ntf-row">
      <div className="ntf-row-main"><span className="ntf-row-label">This device</span><span className="ntf-row-hint">{hint}</span></div>
      <div className="ntf-row-ctl">
        {state === "granted" && enabled ? (
          <Button size="sm" variant="fill" onClick={onDisable}>Turn off</Button>
        ) : (
          <Button size="sm" variant="fill" disabled={state === "denied" || busy} onClick={enable}>
            {state === "denied" ? "Blocked" : busy ? "Asking…" : "Enable"}
          </Button>
        )}
      </div>
    </div>
  );
}
