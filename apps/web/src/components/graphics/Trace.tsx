import type { CSSProperties } from "react";
import "./gfx.css";
import "./Trace.css";
import { cls, cx, useGfxId } from "./util";
import type { Pt, TraceGeo } from "./trace";

const s = cls("gfx-trace");

/** Renders a trace (glow, tapered tail, hot head, dotted path ahead) inside an SVG. */
export function TraceMarks({
  geo,
  nodes,
  className,
  style,
  blur = 1,
}: {
  geo: TraceGeo;
  /** Points along the path, lit when passed: [x, y, lit]. */
  nodes?: Array<[number, number, boolean]>;
  className?: string;
  style?: CSSProperties;
  /** Glow blur scale. */
  blur?: number;
}) {
  const id = useGfxId("tr");
  const w = geo.width;
  return (
    <g className={cx(s.trace, className)} style={style}>
      <defs>
        <filter id={`${id}-b`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={(w * 1.4 * blur).toFixed(2)} />
        </filter>
      </defs>
      {geo.ahead ? <path d={geo.ahead} className={s.ahead} strokeWidth={geo.aheadWidth} strokeDasharray={`0.1 ${(w * 2.4).toFixed(1)}`} /> : null}
      {geo.glow ? <path d={geo.glow} className={s.glow} strokeWidth={geo.glowWidth} filter={`url(#${id}-b)`} /> : null}
      {geo.tail.map((t, i) => (
        <path key={i} d={t.d} className={s.tail} strokeWidth={t.w.toFixed(2)} strokeOpacity={t.o.toFixed(3)} strokeLinecap={i === geo.tail.length - 1 ? "round" : "butt"} />
      ))}
      {nodes?.map(([x, y, lit], i) => (
        <circle key={`n${i}`} cx={x} cy={y} r={w * 1.5} className={lit ? s.nodeLit : s.node} strokeWidth={Math.max(1, w * 0.5)} />
      ))}
      {geo.head ? <Head at={geo.head} w={w} id={id} /> : null}
    </g>
  );
}

export function Head({ at, w, id }: { at: Pt; w: number; id: string }) {
  return (
    <>
      <circle cx={at[0]} cy={at[1]} r={w * 3.2} className={s.halo} filter={`url(#${id}-b)`} />
      <circle cx={at[0]} cy={at[1]} r={w * 0.95} className={s.head} />
    </>
  );
}
