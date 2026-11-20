"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import "../gfx.css";
import "./RigFigure.css";
import { cls, cx, useGfxId } from "../util";
import { BELL_OUTLINE, BELL_SHEEN, BELL_SPEC, BELL_WINDOW } from "./bell";
import { MOVES, type MoveName } from "./library";
import { Line, traceGeo, type Pt, type TraceGeo } from "../trace";
import { duration, geoAt, GROUND, sampleMove, solve, type Geo, type MoveDef, type Order } from "./rig";

const g = cls("gfx");
const s = cls("gfx-rig");

type LayerName = "far" | "torso" | "legN" | "bell" | "armN" | "hand";

const ORDERS: Record<Order, LayerName[]> = {
  out: ["far", "torso", "legN", "bell", "armN", "hand"],
  over: ["far", "torso", "legN", "armN", "bell", "hand"],
  between: ["far", "torso", "bell", "armN", "hand", "legN"],
  behind: ["far", "bell", "torso", "legN", "armN", "hand"],
};

/** Which shapes cut a hairline gap into a layer when they sit above it. */
function cutters(layer: LayerName, order: Order): LayerName[] {
  const list = ORDERS[order];
  const above = list.slice(list.indexOf(layer) + 1);
  // The hand grows out of the forearm and wraps the handle: never part them.
  return above.filter((l) => !(layer === "armN" && l === "hand") && !(layer === "bell" && l === "hand"));
}

export interface RigFigureProps {
  move: MoveDef | MoveName;
  size?: number;
  /** Loop the movement (reduced motion shows the still). */
  animated?: boolean;
  /** Freeze at this loop phase, 0..1. */
  at?: number;
  speed?: number;
  /** Limb girth multiplier. */
  weight?: number;
  /** Hide the floor shadow, trace and accent extras. */
  bare?: boolean;
  trace?: boolean;
  /** Overlay the skeleton (development aid). */
  debug?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const PATHS = [
  "farUpper",
  "farFore",
  "farHand",
  "farThigh",
  "farShin",
  "farFoot",
  "farSole",
  "torso",
  "neck",
  "head",
  "nThigh",
  "nShin",
  "nFoot",
  "nSole",
  "nThighCut",
  "nUpper",
  "nFore",
  "nUpperCut",
  "nHand",
] as const;
type PathName = (typeof PATHS)[number];

function dOf(geo: Geo): Record<PathName, string> {
  return {
    farUpper: geo.far.upper,
    farFore: geo.far.fore,
    farHand: geo.far.hand,
    farThigh: geo.far.thigh,
    farShin: geo.far.shin,
    farFoot: geo.far.foot,
    farSole: geo.far.sole,
    torso: geo.torso,
    neck: geo.neck,
    head: geo.head,
    nThigh: geo.legN.thigh,
    nShin: geo.legN.shin,
    nFoot: geo.legN.foot,
    nSole: geo.legN.sole,
    nThighCut: geo.legN.thighCut,
    nUpper: geo.armN.upper,
    nFore: geo.armN.fore,
    nUpperCut: geo.armN.upperCut,
    nHand: geo.handN,
  };
}

type Live = PathName | "bellA" | "bellS" | "shadow" | "footN" | "footF" | "breath" | "glow" | "halo" | "head";

/* The bell's path through the loop, sampled once per move (the Trace follows it). */
const pathCache = new WeakMap<MoveDef, Array<Pt | null>>();
function bellPath(m: MoveDef): Array<Pt | null> {
  let p = pathCache.get(m);
  if (!p) {
    const K = Math.min(480, Math.max(120, Math.round(duration(m) * 60)));
    p = Array.from({ length: K }, (_, i) => {
      const { pose, disc } = sampleMove(m, i / K);
      return solve(pose, disc, m.cfg).bellCentre;
    });
    pathCache.set(m, p);
  }
  return p;
}
const TAIL_N = 18;
/** The exposure at phase t: the bell's last stretch of path, hot at the bell, cooling behind it. */
function traceAt(m: MoveDef, t: number, width: number): TraceGeo | null {
  const path = bellPath(m);
  const K = path.length;
  const steps = Math.round((m.traceTail ?? 0.5) * K);
  const i0 = Math.round((((t % 1) + 1) % 1) * K);
  const pts: Pt[] = [];
  for (let k = steps; k >= 0; k--) {
    const q = path[(((i0 - k) % K) + K) % K];
    if (!q) continue;
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) > 0.35) pts.push(q);
  }
  if (pts.length < 3) return null;
  return traceGeo(new Line(pts), 1, { width, segments: TAIL_N, tail: 1, ahead: false, floor: 0.03 });
}

const breathT = (geo: Geo) => {
  const c = geo.joints.belly ?? geo.joints.waist;
  return `translate(${c[0].toFixed(1)} ${c[1].toFixed(1)}) scale(${(0.7 + geo.breath * 0.5).toFixed(3)})`;
};

/**
 * A coach-grade movement illustration: a filled, softly lit athlete on a real
 * rig (true limb lengths, planted feet, hands on the handle), the kettlebell
 * as the single accent. Server-renders the still; animates on the client.
 */
const vsOf = (m: MoveDef) => (m.view ?? [0, 0, 240])[2];

export function RigFigure({
  move: moveProp,
  size = 240,
  animated = true,
  at,
  speed = 1,
  weight = 1,
  bare = false,
  trace,
  debug = false,
  title,
  className,
  style,
}: RigFigureProps) {
  const id = useGfxId("rig");
  const move = typeof moveProp === "string" ? MOVES[moveProp] : moveProp;
  const phase0 = at ?? move.still;
  const geo0 = useMemo(() => geoAt(move, phase0, weight), [move, phase0, weight]);
  const [order, setOrder] = useState<Order>(geo0.order);
  const refs = useRef<Partial<Record<Live, SVGElement | null>>>({});
  const svgRef = useRef<SVGSVGElement | null>(null);
  const showTrace = (trace ?? true) && !bare && size >= 64 && move.cfg.grip !== "none";
  const traceW = Math.max(1.8, (vsOf(move) / size) * 2.2);
  const trace0 = useMemo(() => (showTrace ? traceAt(move, phase0, traceW) : null), [move, phase0, showTrace, traceW]);
  const tailRefs = useRef<Array<SVGPathElement | null>>([]);
  const [vx, vy, vs] = move.view ?? [0, 0, 240];
  const filt = `${id}-glow`;
  // A hairline gap of about 1 px at any size.
  const gap = Math.max(1.3, Math.min(6, vs / size));
  const fine = size >= 64;

  useEffect(() => {
    setOrder(geo0.order);
  }, [geo0.order]);

  useEffect(() => {
    if (!animated || at !== undefined) return;
    const svg = svgRef.current;
    if (!svg) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let visible = true;
    const T = (duration(move) * 1000) / speed;
    let start = performance.now() - phase0 * T;
    let last = geo0.order;
    let tNow = phase0;

    const apply = (geo: Geo) => {
      const d = dOf(geo);
      for (const name of PATHS) refs.current[name]?.setAttribute("d", d[name]);
      if (geo.bell) {
        refs.current.bellA?.setAttribute("transform", geo.bell);
        refs.current.bellS?.setAttribute("transform", geo.bell);
      }
      const sh = refs.current.shadow;
      if (sh) {
        sh.setAttribute("cx", geo.shadow.cx.toFixed(1));
        sh.setAttribute("rx", geo.shadow.rx.toFixed(1));
      }
      (["footN", "footF"] as const).forEach((k, i) => {
        const el = refs.current[k];
        if (el) {
          el.setAttribute("cx", geo.feet[i][0].toFixed(1));
          el.setAttribute("opacity", geo.feet[i][1].toFixed(2));
        }
      });
      refs.current.breath?.setAttribute("transform", breathT(geo));
      if (showTrace) {
        const tr = traceAt(move, tNow, traceW);
        tailRefs.current.forEach((el, i) => el?.setAttribute("d", tr?.tail[i]?.d ?? ""));
        refs.current.glow?.setAttribute("d", tr?.glow ?? "");
        const h = tr?.head;
        for (const k of ["halo", "head"] as const) {
          const el = refs.current[k];
          if (el && h) {
            el.setAttribute("cx", h[0].toFixed(1));
            el.setAttribute("cy", h[1].toFixed(1));
          }
        }
      }
      if (geo.order !== last) {
        last = geo.order;
        setOrder(geo.order);
      }
    };
    const tick = (now: number) => {
      raf = 0;
      if (!visible || mq.matches) return;
      const t = ((now - start) % T) / T;
      tNow = t;
      apply(geoAt(move, t, weight));
      raf = requestAnimationFrame(tick);
    };
    const play = () => {
      if (!raf && visible && !mq.matches) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      const was = visible;
      visible = entries.some((e) => e.isIntersecting);
      if (visible && !was) play();
    });
    io.observe(svg);
    const onMq = () => {
      if (mq.matches) {
        tNow = phase0;
        apply(geo0);
      }
      else {
        start = performance.now();
        play();
      }
    };
    mq.addEventListener("change", onMq);
    play();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, [animated, at, move, phase0, speed, weight, geo0, showTrace, traceW]);

  const d0 = dOf(geo0);
  const P = (name: PathName, className?: string) => (
    <path
      id={`${id}-${name}`}
      ref={(el) => void (refs.current[name] = el)}
      d={d0[name]}
      className={className}
      suppressHydrationWarning
    />
  );
  const use = (name: PathName) => <use href={`#${id}-${name}`} />;
  const layerHref: Record<LayerName, string> = {
    far: `#${id}-g-far`,
    torso: `#${id}-g-torso`,
    legN: `#${id}-g-legN`,
    bell: `#${id}-g-bellS`,
    armN: `#${id}-g-armN`,
    hand: `#${id}-g-hand`,
  };
  /** The torso is only cut by the distal parts of the near limbs, so shoulders and hips stay joined. */
  const cutHref = (cutter: LayerName, layer: LayerName) => {
    if (layer === "torso" && cutter === "legN") return `#${id}-g-legNc`;
    if (layer === "torso" && cutter === "armN") return `#${id}-g-armNc`;
    return layerHref[cutter];
  };
  const MASKED: LayerName[] = ["far", "torso", "legN", "bell", "armN", "hand"];
  const INK: LayerName[] = ["torso", "legN", "armN", "hand"];
  const hasBell = !!geo0.bell;
  const [g0, g1, gs] = [vx - 20, vy - 20, vs + 40];

  const layer = (name: LayerName) => {
    if (name === "bell") {
      if (!hasBell) return null;
      return (
        <g key="bell" mask={`url(#${id}-m-bell)`}>
          <g ref={(el) => void (refs.current.bellA = el)} transform={geo0.bell ?? undefined} suppressHydrationWarning>
            <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" fill={`url(#${id}-bell)`} />
            {fine ? (
              <>
                <path d={BELL_SPEC} className={s.bellSpec} />
                <path d={BELL_SHEEN} className={s.bellSheen} />
              </>
            ) : null}
          </g>
        </g>
      );
    }
    const main = (
      <use key={name} href={layerHref[name]} mask={`url(#${id}-m-${name})`} className={name === "far" ? s.far : s.ink} />
    );
    if (name === "legN" && fine) {
      return [main, <use key="sole" href={`#${id}-nSole`} mask={`url(#${id}-m-legN)`} className={s.sole} />];
    }
    return main;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${vx} ${vy} ${vs} ${vs}`}
      width={size}
      height={size}
      role="img"
      aria-label={title ?? move.label}
      className={cx(g.root, s.fig, className)}
      style={style}
    >
      <defs>
        <radialGradient id={`${id}-bell`} cx=".34" cy=".56" r=".75">
          <stop offset="0" className={s.bellHi} />
          <stop offset=".55" className={s.bellMid} />
          <stop offset="1" className={s.bellLo} />
        </radialGradient>
        <filter id={filt} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={(traceW * 1.5).toFixed(2)} />
        </filter>
        <radialGradient id={`${id}-floor`} cx=".5" cy=".5" r=".5">
          <stop offset="0" className={s.floorA} />
          <stop offset="1" className={s.floorB} />
        </radialGradient>
        <g id={`${id}-g-far`}>
          {P("farThigh")}
          {P("farShin")}
          {P("farFoot")}
          {P("farSole", s.farSole)}
          {P("farUpper")}
          {P("farFore")}
          {P("farHand")}
        </g>
        <g id={`${id}-g-torso`}>
          {P("torso")}
          {P("neck")}
          {P("head")}
        </g>
        <g id={`${id}-g-legN`}>
          {P("nThigh")}
          {P("nShin")}
          {P("nFoot")}
          {P("nSole")}
        </g>
        <g id={`${id}-g-legNc`}>
          {P("nThighCut")}
          {use("nShin")}
          {use("nFoot")}
          {use("nSole")}
        </g>
        <g id={`${id}-g-armN`}>
          {P("nUpper")}
          {P("nFore")}
        </g>
        <g id={`${id}-g-armNc`}>
          {P("nUpperCut")}
          {use("nFore")}
        </g>
        <g id={`${id}-g-hand`}>{P("nHand")}</g>
        <g id={`${id}-g-bellS`}>
          {hasBell ? (
            <g ref={(el) => void (refs.current.bellS = el)} transform={geo0.bell ?? undefined} suppressHydrationWarning>
              <path d={BELL_OUTLINE} />
            </g>
          ) : null}
        </g>
        {MASKED.map((m) => {
          const on = m === "far" ? (["torso", "legN", "bell", "armN", "hand"] as LayerName[]) : cutters(m, order);
          return (
            <mask key={m} id={`${id}-m-${m}`} maskUnits="userSpaceOnUse" x={g0} y={g1} width={gs} height={gs}>
              <rect x={g0} y={g1} width={gs} height={gs} fill="#fff" />
              <g fill="#000" stroke="#000" strokeWidth={gap * 2} strokeLinejoin="round">
                {on.map((c) => (c === "bell" && !hasBell ? null : <use key={c} href={cutHref(c, m)} />))}
              </g>
            </mask>
          );
        })}
        {/* Rim light: each ink shape minus itself shifted, leaving a sliver on the lit edge. */}
        <mask id={`${id}-m-rim`} maskUnits="userSpaceOnUse" x={g0} y={g1} width={gs} height={gs}>
          <g fill="#fff">
            {INK.map((l) => (
              <use key={l} href={layerHref[l]} />
            ))}
          </g>
          <g fill="#000" className={s.rimShift}>
            {INK.map((l) => (
              <use key={l} href={layerHref[l]} />
            ))}
          </g>
        </mask>
      </defs>

      {!bare ? (
        <g>
          <ellipse
            ref={(el) => void (refs.current.shadow = el)}
            cx={geo0.shadow.cx}
            cy={GROUND + 0.6}
            rx={geo0.shadow.rx}
            ry={5}
            fill={`url(#${id}-floor)`}
            suppressHydrationWarning
          />
          {geo0.feet.map((f, i) => (
            <ellipse
              key={i}
              ref={(el) => void (refs.current[i ? "footF" : "footN"] = el)}
              cx={f[0]}
              cy={GROUND + 0.3}
              rx={12.5}
              ry={1.6}
              opacity={f[1]}
              className={i ? s.contactFar : s.contact}
              suppressHydrationWarning
            />
          ))}
        </g>
      ) : null}
      {trace0 ? (
        <g className={s.trace}>
          <path ref={(el) => void (refs.current.glow = el)} d={trace0.glow} className={s.traceGlow} strokeWidth={trace0.glowWidth} filter={`url(#${filt})`} suppressHydrationWarning />
          {trace0.tail.map((t, i) => (
            <path
              key={i}
              ref={(el) => void (tailRefs.current[i] = el)}
              d={t.d}
              className={s.traceTail}
              strokeWidth={t.w.toFixed(2)}
              strokeOpacity={t.o.toFixed(3)}
              strokeLinecap={i === TAIL_N - 1 ? "round" : "butt"}
              suppressHydrationWarning
            />
          ))}
          {trace0.head ? (
            <circle ref={(el) => void (refs.current.halo = el)} cx={trace0.head[0]} cy={trace0.head[1]} r={traceW * 5} className={s.traceHalo} filter={`url(#${filt})`} suppressHydrationWarning />
          ) : null}
        </g>
      ) : null}
      {!bare && move.extra === "breath" ? (
        <g ref={(el) => void (refs.current.breath = el)} transform={breathT(geo0)} className={s.breath} suppressHydrationWarning>
          <circle r={14} className={s.breathOuter} />
          <circle r={8.5} className={s.breathInner} />
        </g>
      ) : null}

      {ORDERS[order].map(layer)}

      {fine ? (
        <g mask={`url(#${id}-m-rim)`} className={s.rim}>
          {INK.map((l) => (
            <use key={l} href={layerHref[l]} mask={`url(#${id}-m-${l})`} />
          ))}
        </g>
      ) : null}


      {debug ? (
        <g className={s.debug}>
          {Object.entries(geo0.joints).map(([k, v]) => (
            <circle key={k} cx={v[0]} cy={v[1]} r={1.6} />
          ))}
          <path d={`M-40 ${GROUND}H300`} />
        </g>
      ) : null}
    </svg>
  );
}
