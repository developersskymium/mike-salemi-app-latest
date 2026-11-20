"use client";

import { useMemo, useState } from "react";
import { Button, Icon, useToast } from "@/components/ui";
import { haptic } from "@/components/ui/motion";
import { toolDef, type Answers, type SelectorResult } from "@/components/discover/tools/defs";
import type { ShopProduct } from "@/lib/loaders/shop";
import { money } from "@/components/you/format";
import { cart } from "./cart";
import { BellArt } from "./BellArt";
import { nearestBell, unitCents } from "./pricing";

/**
 * The Kettlebell Selector, built into the shop: the same four questions and scenarios as the tool
 * (tools.kettlebell-selector config), one question at a time; the result adds the bell to the cart.
 */
export function SelectorCard({ config, products, member, onAdded }: { config: Record<string, unknown>; products: ShopProduct[]; member: boolean; onAdded: () => void }) {
  const def = useMemo(() => toolDef("kettlebell-selector", config, null), [config]);
  const [a, setA] = useState<Answers>({});
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const bell = products.find((p) => p.slug === "competition-kettlebell");
  const starter = products.find((p) => p.slug === "starter-set");
  if (!def || !bell) return null;
  const steps = def.steps(a);
  const step = steps.find((s) => !a[s.id]);
  const result = !step ? (def.result(a) as SelectorResult | null) : null;
  const done = steps.filter((s) => a[s.id]).length;

  const weights = bell.variants.map((v) => v.weight_kg ?? 0).filter(Boolean);
  const picks = result ? result.bells.map((b) => nearestBell(b.size, weights)) : [];
  const start = picks[1] ?? picks[0];
  const startVariant = bell.variants.find((v) => v.weight_kg === start);
  const starterVariant = starter?.variants.find((v) => v.key === (a.gender === "female" ? "women" : "men"));

  const add = (p: ShopProduct, vId: string, label: string) => {
    haptic(8);
    cart.add(p.id, vId, 1);
    toast(`${label} added to your cart`, { tone: "success", icon: "check" });
    onAdded();
  };

  if (!open) {
    return (
      <section className="shp-sel" aria-labelledby="shp-sel-h">
        <BellArt weights={[8, 16, 24]} size={88} className="shp-sel-art" />
        <div className="shp-sel-text">
          <p className="lq-eyebrow" data-tone="accent">Kettlebell Selector</p>
          <h2 id="shp-sel-h" className="lq-d-sm">Not sure which weight?</h2>
          <p className="lq-t15 lq-c2">Four quick questions. Mike&apos;s chart picks the bell to start with.</p>
        </div>
        <Button onClick={() => setOpen(true)} iconAfter="arrowRight">Find my bell</Button>
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
      ) : result && startVariant ? (
        <div className="shp-sel-res">
          <BellArt weights={picks} size={104} className="shp-sel-art" />
          <div className="shp-sel-text">
            <h2 id="shp-sel-h" className="lq-d-sm">Start with the {start} kg</h2>
            <p className="lq-t15 lq-c2">{result.summary}</p>
            <p className="lq-t13 lq-c2 lq-num">Your set, lightest to heaviest: {picks.map((w) => `${w} kg`).join(" · ")}</p>
          </div>
          <div className="shp-sel-acts">
            <Button icon="shop" onClick={() => add(bell, startVariant.id, `${start} kg kettlebell`)}>Add the {start} kg · {money(unitCents(startVariant, member), startVariant.currency)}</Button>
            {starter && starterVariant && (
              <Button variant="secondary" onClick={() => add(starter, starterVariant.id, starter.name)}>Or the Starter Set · {money(unitCents(starterVariant, member), starterVariant.currency)}</Button>
            )}
          </div>
        </div>
      ) : (
        <p className="lq-t15 lq-c2"><Icon name="info" size="xs" /> No match for those answers. Start over, or pick 12 kg (women) or 16 kg (men), the usual first bell.</p>
      )}
    </section>
  );
}
