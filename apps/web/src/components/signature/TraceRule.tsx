import type { CSSProperties } from "react";

/** A hairline divider (the Trace light point is retired). */
export function TraceRule({ align = "end", className, style }: { align?: "start" | "end" | "center"; className?: string; style?: CSSProperties }) {
  return <hr className={className ? `tr-rule ${className}` : "tr-rule"} data-align={align} style={style} />;
}

/** A short ember dash that marks list items and active states. */
export function TraceDash({ className, style }: { className?: string; style?: CSSProperties }) {
  return <i aria-hidden className={className ? `tr-dash ${className}` : "tr-dash"} style={style} />;
}
