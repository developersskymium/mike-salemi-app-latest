"use client";

import { motion } from "@ms/tokens";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Glass } from "./Glass";
import { Icon, type IconName } from "./Icon";

type Toast = { id: number; message: string; tone: "neutral" | "success"; icon?: IconName; action?: { label: string; onClick: () => void }; leaving?: boolean };
type ShowToast = (message: string, opts?: { tone?: Toast["tone"]; icon?: IconName; action?: Toast["action"]; duration?: number }) => void;

const Ctx = createContext<ShowToast>(() => {});

/** `const toast = useToast(); toast("Saved")`. Messages name the action: "Saved", "Published". */
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setItems((xs) => xs.filter((t) => t.id !== id)), motion.duration.toast);
  }, []);
  const show = useCallback<ShowToast>(
    (message, opts = {}) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-2), { id, message, tone: opts.tone ?? "neutral", icon: opts.icon, action: opts.action }]);
      window.setTimeout(() => dismiss(id), opts.duration ?? 3200);
    },
    [dismiss],
  );
  const value = useMemo(() => show, [show]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="lq-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <Glass key={t.id} level="thick" float className="lq-toast" data-tone={t.tone} data-leaving={t.leaving ? "" : undefined}>
            <span className="lq-toast-ic" aria-hidden>
              <Icon name={t.icon ?? (t.tone === "success" ? "check" : "sparkle")} size="xs" />
            </span>
            <span className="lq-t15" style={{ fontWeight: 600 }}>
              {t.message}
            </span>
            {t.action && (
              <button type="button" className="lq-btn" data-variant="plain" data-size="sm" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>
                {t.action.label}
              </button>
            )}
          </Glass>
        ))}
      </div>
    </Ctx.Provider>
  );
}
