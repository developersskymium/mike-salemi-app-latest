"use client";

import { motion } from "@ms/tokens";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Glass } from "./Glass";
import { IconButton } from "./IconButton";
import { haptic, prefersReducedMotion } from "./motion";

type Detent = "medium" | "large";
const DETENT_H: Record<Detent, string> = { medium: "56dvh", large: "calc(100dvh - 84px)" };

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Sticky footer (the sheet's primary action). */
  footer?: ReactNode;
  /** Phone detents; the first is where it opens. */
  detents?: Detent[];
  /** Desktop presentation: centred panel or a side panel. */
  desktop?: "center" | "side";
};

/** iOS rubber band: resistance grows the further you pull. */
const rubber = (x: number, dim: number) => (1 - 1 / ((x * motion.rubberBand) / dim + 1)) * dim;

/**
 * Bottom sheet on phone (grabber, detents, swipe down to dismiss, rubber-band past the top),
 * centre or side panel on desktop. Native <dialog>: focus trap, Esc and inert background.
 */
export function Sheet({ open, onClose, title, description, children, footer, detents = ["large"], desktop = "center" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [detent, setDetent] = useState<Detent>(detents[0]!);
  const drag = useRef<{ y0: number; t0: number; dy: number } | null>(null);

  const close = useCallback(() => {
    const d = ref.current;
    if (!d?.open) return;
    if (prefersReducedMotion()) {
      d.close();
      return;
    }
    d.setAttribute("data-closing", "");
    window.setTimeout(() => {
      d.removeAttribute("data-closing");
      d.style.removeProperty("--drag");
      d.close();
    }, motion.duration.sheet * 0.6);
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setDetent(detents[0]!);
      d.showModal();
    } else if (!open && d.open) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onDown = (e: PointerEvent) => {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    drag.current = { y0: e.clientY, t0: performance.now(), dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ref.current?.setAttribute("data-dragging", "");
  };
  const onMove = (e: PointerEvent) => {
    const s = drag.current;
    const d = ref.current;
    if (!s || !d) return;
    s.dy = e.clientY - s.y0;
    const h = d.getBoundingClientRect().height;
    const y = s.dy < 0 ? -rubber(-s.dy, h) : s.dy;
    d.style.setProperty("--drag", `${y}px`);
  };
  const onUp = () => {
    const s = drag.current;
    const d = ref.current;
    drag.current = null;
    if (!s || !d) return;
    d.removeAttribute("data-dragging");
    const h = d.getBoundingClientRect().height;
    const v = s.dy / Math.max(1, performance.now() - s.t0); // px/ms
    d.style.setProperty("--drag", "0px");
    if (s.dy > h * motion.sheetDismiss || v > 0.6) {
      if (detent === "large" && detents.includes("medium") && s.dy < h * 0.5) {
        setDetent("medium");
        haptic(6);
        return;
      }
      haptic(6);
      onClose();
      return;
    }
    if (s.dy < -40 && detent === "medium" && detents.includes("large")) {
      setDetent("large");
      haptic(6);
    }
  };

  return (
    <dialog
      ref={ref}
      className="lq-sheet"
      data-desktop={desktop}
      aria-labelledby={titleId}
      style={{ "--sheet-h": DETENT_H[detent] } as CSSProperties}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => open && onClose()}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <Glass level="thick" float className="lq-sheet-panel">
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ cursor: "grab" }}>
          <i className="lq-grabber" aria-hidden />
          <div className="lq-sheet-head">
            <div>
              <h2 id={titleId} className="lq-t22">
                {title}
              </h2>
              {description && <p className="lq-t15 lq-c2" style={{ marginTop: 2 }}>{description}</p>}
            </div>
            <IconButton icon="close" label="Close" variant="fill" size="sm" iconSize="sm" onClick={onClose} />
          </div>
        </div>
        <div className="lq-sheet-body">{children}</div>
        {footer && <div style={{ padding: "12px 0 16px", flex: "none" }}>{footer}</div>}
      </Glass>
    </dialog>
  );
}
