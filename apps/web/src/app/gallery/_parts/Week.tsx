import { Icon } from "@/components/ui";

/** Gallery-only week strip (Today's real one is built by workstream B with these tokens). */
const DAYS: [string, number, "done" | "rest" | "today" | "" | "rest-up", number?][] = [
  ["M", 16, "done"], ["T", 17, "done"], ["W", 18, "rest"], ["T", 19, "done"], ["F", 20, "today", 2 / 7], ["S", 21, ""], ["S", 22, "rest-up"],
];

function Mini({ p }: { p: number }) {
  const r = 17, len = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" style={{ position: "absolute", inset: 0 }} aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--ring-1)" strokeOpacity=".16" strokeWidth="3.5" />
      {p > 0 && (
        <circle className="lq-arc" cx="20" cy="20" r={r} fill="none" stroke={p >= 1 ? "var(--label)" : "var(--accent)"} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - p)} transform="rotate(-90 20 20)" style={{ ["--len" as string]: len }} />
      )}
    </svg>
  );
}

export function Week() {
  return (
    <div className="lq-rings" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", rowGap: 6 }}>
      {DAYS.map(([d, , s], i) => (
        <span key={i} className="lq-t13" style={{ fontWeight: 600, color: s === "today" ? "var(--accent-ink)" : "var(--label-2)" }}>{d}</span>
      ))}
      {DAYS.map(([, n, s, p], i) => (
        <span key={`d${i}`} style={{ position: "relative", width: 40, height: 40, margin: "0 auto", display: "grid", placeItems: "center", font: "600 15px/1 var(--font)", fontVariantNumeric: "tabular-nums", color: s === "today" ? "var(--accent-ink)" : s.startsWith("rest") ? "var(--label-3)" : undefined, fontWeight: s === "today" ? 750 : 600 }}>
          {s !== "rest-up" && <Mini p={s === "done" || s === "rest" ? 1 : p ?? 0} />}
          {s.startsWith("rest") ? <Icon name="moon" size="xs" /> : <span style={{ color: s === "" ? "var(--label-2)" : undefined }}>{n}</span>}
        </span>
      ))}
    </div>
  );
}
