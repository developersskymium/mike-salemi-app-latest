"use client";

import { useMemo, useState } from "react";
import { Button, Icon } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { toolDef, type Answers, type SelectorResult } from "@/components/discover/tools/defs";
import { BellArt } from "./BellArt";
import { nearestBell } from "./pricing";

const COMP_WEIGHTS = [8, 12, 16, 20, 24, 28, 32];

/**
 * The Kettlebell Selector, in the shop: the same four questions and scenarios as the tool
 * (tools.kettlebell-selector config), one question at a time. Mike doesn't sell kettlebells here, so the
 * result recommends the competition weights to train with and points to Kettlebell Lifestyle.
 */
export function SelectorCard({ config }: { config: Record<string, unknown> }) {
  const def = useMemo(() => toolDef("kettlebell-selector", config, null), [config]);
  const [a, setA] = useState<Answers>({});
  const [open, setOpen] = useState(false);
  if (!def) return null;
  const steps = def.steps(a);
  const step = steps.find((s) => !a[s.id]);
  const result = !step ? (def.result(a) as SelectorResult | null) : null;
  const done = steps.filter((s) => a[s.id]).length;

  const picks = result ? result.bells.map((b) => nearestBell(b.size, COMP_WEIGHTS)) : [];
  const start = picks[0];

  if (!open) {
    return (
      <section className="shp-sel" aria-labelledby="shp-sel-h">
        <BellArt weights={[8, 16, 24]} size={88} className="shp-sel-art" />
        <div className="shp-sel-text">
          <p className="lq-eyebrow" data-tone="accent">Kettlebell Selector</p>
          <h2 id="shp-sel-h" className="lq-d-sm">Which kettlebell weight is yours?</h2>
          <p className="lq-t15 lq-c2">Four quick questions. Mike&apos;s chart picks the competition bells to train with.</p>
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)} iconAfter="arrowRight">Find my weight</Button>
      </section>
    );
  }

  return (
    <section className="shp-sel" data-open="" aria-labelledby="shp-sel-h" aria-live="polite">
      <div className="shp-sel-head">
        <p className="lq-eyebrow" data-tone="accent">Kettlebell Selector</p>
        <span className="shp-sel-progress" aria-hidden><i style={{ width: `${(done / Math.max(1, steps.length)) * 100}%` }} /></span>
        <button type="button" className="shp-sel-reset lq-t13" onClick={() => (done ? setA({}) : setOpen(false))}>{done ? "Start over" : "Close"}</button>
      </div>
      {step ? (
        <div className="shp-sel-q">
          <h2 id="shp-sel-h" className="lq-d-sm">{step.question}</h2>
          {step.help && <p className="lq-t13 lq-c2">{step.help}</p>}
          <div className="shp-sel-opts" role="radiogroup" aria-label={step.question}>
            {step.options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={false}
                className="shp-sel-opt lq-press"
                onClick={() => {
                  haptic(6);
                  setA((x) => ({ ...x, [step.id]: o.value }));
                }}
              >
                <span className="lq-t15">{o.label}</span>
                {o.description && <span className="lq-t13 lq-c2">{o.description}</span>}
              </button>
            ))}
          </div>
        </div>
      ) : result && start ? (
        <div className="shp-sel-res">
          <BellArt weights={picks} size={104} className="shp-sel-art" />
          <div className="shp-sel-text">
            <h2 id="shp-sel-h" className="lq-d-sm">Start with the {start} kg</h2>
            <p className="lq-t15 lq-c2">{result.summary}</p>
            <p className="lq-t13 lq-c2 lq-num">Your set, lightest to heaviest: {picks.map((w) => `${w} kg`).join(" · ")}</p>
          </div>
          <div className="shp-sel-acts">
            <Button href="/programs/kettlebell-lifestyle" iconAfter="arrowRight">Train with it in Kettlebell Lifestyle</Button>
            <Button variant="ghost" href="/tools/kettlebell-selector">Full result and why</Button>
          </div>
        </div>
      ) : (
        <p className="lq-t15 lq-c2"><Icon name="info" size="xs" /> No match for those answers. Start over, or pick 12 kg (women) or 16 kg (men), the usual first bell.</p>
      )}
    </section>
  );
}
