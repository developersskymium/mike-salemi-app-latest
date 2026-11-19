import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { payAndUnlock } from "@/lib/checkout.functions";
import { buttonStyles } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export type CheckoutItem = {
  productId: string;
  kind: "course" | "retreat" | "program" | "product" | "coaching";
  name: string;
  summary?: string;
  variant?: string;
  priceCents: number;
  /** Line shown under the total, e.g. "One-time payment · lifetime access". */
  terms?: string;
  metadata?: Record<string, unknown>;
};

export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Mock checkout sheet. Slides up on mobile, centres on desktop. No live
 * payment provider is connected — the card fields are demo-only and the order
 * is recorded server-side so access unlocks immediately.
 */
export function CheckoutSheet({
  item,
  onClose,
  onSuccess,
}: {
  item: CheckoutItem | null;
  onClose: () => void;
  onSuccess?: (reference: string) => void;
}) {
  const queryClient = useQueryClient();
  const pay = useServerFn(payAndUnlock);
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/29");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (item) setDone(null);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [item, onClose]);

  const mutation = useMutation({
    mutationFn: () =>
      pay({
        data: {
          productId: item!.productId,
          kind: item!.kind,
          name: item!.name,
          variant: item!.variant,
          priceCents: item!.priceCents,
          metadata: item!.metadata,
        },
      }),
    onSuccess: (result) => {
      setDone(result.reference);
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onSuccess?.(result.reference);
    },
  });

  if (!item) return null;

  const valid = digits(card).length >= 15 && digits(expiry).length === 4 && digits(cvc).length >= 3;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Checkout — ${item.name}`}>
      <button
        type="button"
        aria-label="Close checkout"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/35 backdrop-blur-[3px]"
      />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:grid sm:place-items-center sm:p-6">
        <div className="animate-sheet-up max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-hairline bg-background pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-full sm:max-w-md sm:rounded-3xl sm:border">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" />

          {done ? (
            <div className="px-6 py-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/12 text-primary">
                <Check className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-xl font-semibold text-foreground">You're in</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.name} is unlocked. Receipt reference{" "}
                <span className="numeric text-foreground">{done}</span>.
              </p>
              <button type="button" onClick={onClose} className={cn(buttonStyles.primary, "mt-6 w-full")}>
                Continue
              </button>
            </div>
          ) : (
            <div className="px-5 pt-4 sm:px-6 sm:pt-6">
              <p className="eyebrow text-primary">Checkout</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{item.name}</h2>
              {item.summary && <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>}

              <div className="mt-4 rounded-2xl border border-hairline bg-surface/60 p-4">
                <Row label={item.variant ?? "Access"} value={formatMoney(item.priceCents)} />
                <Row label="Tax" value="Calculated at payment" muted />
                <div className="mt-3 border-t border-hairline pt-3">
                  <Row label="Total due today" value={formatMoney(item.priceCents)} strong />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <Field label="Name on card">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    autoComplete="cc-name"
                    className={inputClass}
                  />
                </Field>
                <Field label="Card number" icon={<CreditCard className="h-4 w-4" />}>
                  <input
                    value={card}
                    inputMode="numeric"
                    onChange={(e) =>
                      setCard(
                        digits(e.target.value)
                          .slice(0, 16)
                          .replace(/(.{4})/g, "$1 ")
                          .trim(),
                      )
                    }
                    placeholder="4242 4242 4242 4242"
                    className={cn(inputClass, "numeric pl-10")}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiry">
                    <input
                      value={expiry}
                      inputMode="numeric"
                      onChange={(e) => {
                        const d = digits(e.target.value).slice(0, 4);
                        setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                      }}
                      placeholder="MM/YY"
                      className={cn(inputClass, "numeric")}
                    />
                  </Field>
                  <Field label="CVC">
                    <input
                      value={cvc}
                      inputMode="numeric"
                      onChange={(e) => setCvc(digits(e.target.value).slice(0, 4))}
                      placeholder="123"
                      className={cn(inputClass, "numeric")}
                    />
                  </Field>
                </div>
              </div>

              <button
                type="button"
                disabled={!valid || mutation.isPending}
                onClick={() => mutation.mutate()}
                className={cn(buttonStyles.primary, "mt-5 w-full disabled:opacity-50")}
              >
                {mutation.isPending ? "Processing…" : `Pay ${formatMoney(item.priceCents)}`}
              </button>

              {mutation.isError && (
                <p className="mt-3 text-sm text-destructive">
                  That payment didn't go through. Try again in a moment.
                </p>
              )}

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Demo checkout — no card is charged.
              </p>
              <p className="mt-1 flex items-center justify-center gap-1.5 pb-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> {item.terms ?? "Access unlocks the moment you pay."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-2xl border border-hairline bg-surface/60 px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary";

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow text-muted-foreground">{label}</span>
      <span className="relative mt-1.5 block">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        {children}
      </span>
    </label>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className={cn("text-sm", muted ? "text-muted-foreground" : "text-foreground")}>{label}</span>
      <span
        className={cn(
          "numeric text-sm",
          muted ? "text-muted-foreground" : "text-foreground",
          strong && "text-base font-semibold",
        )}
      >
        {value}
      </span>
    </div>
  );
}
