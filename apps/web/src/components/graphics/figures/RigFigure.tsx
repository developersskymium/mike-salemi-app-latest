"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, type CSSProperties } from "react";
import "../gfx.css";
import "./RigFigure.css";
import { cls, cx, useGfxId } from "../util";
import { BELL_OUTLINE, BELL_SHEEN, BELL_SPEC, BELL_WINDOW } from "./bell";
import { MOVES, type MoveName } from "./library";
import { Line, type Pt } from "../trace";
import { duration, geoAt, GROUND, sampleMove, solve, type Geo, type MoveDef } from "./rig";
import { cutters, FlipBook, ORDERS, readPaints, type LayerName } from "./player";

const g = cls("gfx");
const s = cls("gfx-rig");

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

/* Reduced motion as an external store: the server (and hydration) render the still. */
const RM = "(prefers-reduced-motion: reduce)";
const subscribeRM = (cb: () => void) => {
  const mq = window.matchMedia(RM);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const reducedNow = () => window.matchMedia(RM).matches;
const reducedServer = () => true;

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
/** The bell's whole path through the loop, as one open path (the motion path drawn in ember dashes). */
const motionCache = new WeakMap<MoveDef, string>();
function motionPath(m: MoveDef): string {
  let d = motionCache.get(m);
  if (d === undefined) {
    const pts = bellPath(m).filter((p): p is Pt => !!p);
    const keep: Pt[] = [];
    for (const q of pts) {
      const last = keep[keep.length - 1];
      if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) > 1.2) keep.push(q);
    }
    d = keep.length > 3 ? new Line(keep).d(0, new Line(keep).total) : "";
    motionCache.set(m, d);
  }
  return d;
}

const MASK_BLACK = { ["--rig-shoe" as string]: "#000" } as CSSProperties;
const MASK_WHITE = { ["--rig-shoe" as string]: "#fff" } as CSSProperties;

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
  const order = geo0.order;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const bodyRef = useRef<SVGGElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The bell's path in ember dashes: on when asked, or by default on a moving figure.
  const showTrace = (trace ?? animated) && !bare && size >= 64 && move.cfg.grip !== "none";
  const traceW = Math.max(1.4, (vsOf(move) / size) * 1.7);
  const motionD = useMemo(() => (showTrace ? motionPath(move) : ""), [move, showTrace]);
  const [vx, vy, vs] = move.view ?? [0, 0, 240];
  // A hairline gap of about 1 px at any size.
  const gap = Math.max(1.3, Math.min(6, vs / size));
  const fine = size >= 64;
  const reduced = useSyncExternalStore(subscribeRM, reducedNow, reducedServer);
  // Moving figures play on a canvas over the SVG still (see ./player): no per-frame DOM or mask work.
  const live = animated && at === undefined && !reduced;

  useEffect(() => {
    if (!live) return;
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    const body = bodyRef.current;
    if (!svg || !canvas || !body || typeof Path2D === "undefined") return;
    const opts = {
      move,
      weight,
      bare,
      fine,
      gap,
      motion: motionD ? { d: motionD, width: traceW * 0.62, dash: [traceW * 1.6, traceW * 2.2] as [number, number] } : null,
      breath: !bare && move.extra === "breath",
    };
    let paints = readPaints(svg, id);
    let px = 0;
    let book: FlipBook | null = null;
    const T = (duration(move) * 1000) / speed;
    const start = performance.now() - phase0 * T;
    let raf = 0;
    let visible = false;
    let shown = -1;
    const rebuild = () => {
      book?.release();
      book = new FlipBook(opts, paints, px);
      shown = -1;
    };
    const fit = () => {
      const r = svg.getBoundingClientRect();
      const next = Math.round(Math.min(Math.min(r.width, r.height) || size, 1200) * Math.min(window.devicePixelRatio || 1, 2));
      if (next !== px) {
        px = next;
        rebuild();
      }
    };
    const tick = (now: number) => {
      raf = 0;
      if (!visible || !book) return;
      const i = Math.floor((((now - start) % T) / T) * book.length) % book.length;
      if (i !== shown) {
        shown = i;
        book.show(canvas, i);
        body.style.visibility = "hidden";
      }
      raf = requestAnimationFrame(tick);
    };
    const play = () => {
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };
    fit();
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      play();
    });
    io.observe(svg);
    const ro = new ResizeObserver(fit);
    ro.observe(svg);
    // Theme switches (data-theme / class on <html>, OS dark mode) re-read the colours.
    const repaint = () => {
      const next = readPaints(svg, id);
      if (JSON.stringify(next) === JSON.stringify(paints)) return;
      paints = next;
      rebuild();
    };
    const mo = new MutationObserver(repaint);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    dark.addEventListener("change", repaint);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      dark.removeEventListener("change", repaint);
      body.style.visibility = "";
      book?.release();
    };
  }, [live, move, weight, bare, fine, gap, motionD, traceW, speed, phase0, size, id]);

  const d0 = dOf(geo0);
  const P = (name: PathName, className?: string) => (
    <path
      id={`${id}-${name}`}
      d={d0[name]}
      className={className}
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
          <g transform={geo0.bell ?? undefined}>
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
      <use key={name} href={layerHref[name]} mask={`url(#${id}-m-${name})`} className={name === "far" ? s.far : s.ink} fill={name === "far" ? undefined : `url(#${id}-ink)`} />
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
        <radialGradient id={`${id}-floor`} cx=".5" cy=".5" r=".5">
          <stop offset="0" className={s.floorA} />
          <stop offset="1" className={s.floorB} />
        </radialGradient>
        <g id={`${id}-g-far`}>
          {P("farThigh")}
          {P("farShin")}
          {P("farFoot", s.shoe)}
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
          {P("nFoot", s.shoe)}
          {P("nSole", s.shoe)}
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
            <g transform={geo0.bell ?? undefined}>
              <path d={BELL_OUTLINE} />
            </g>
          ) : null}
        </g>
        {MASKED.map((m) => {
          const on = m === "far" ? (["torso", "legN", "bell", "armN", "hand"] as LayerName[]) : cutters(m, order);
          return (
            <mask key={m} id={`${id}-m-${m}`} maskUnits="userSpaceOnUse" x={g0} y={g1} width={gs} height={gs}>
              <rect x={g0} y={g1} width={gs} height={gs} fill="#fff" />
              <g fill="#000" stroke="#000" strokeWidth={gap * 2} strokeLinejoin="round" style={MASK_BLACK}>
                {on.map((c) => (c === "bell" && !hasBell ? null : <use key={c} href={cutHref(c, m)} />))}
              </g>
            </mask>
          );
        })}
        {/* Rim light: each ink shape minus itself shifted, leaving a sliver on the lit edge. */}
        <mask id={`${id}-m-rim`} maskUnits="userSpaceOnUse" x={g0} y={g1} width={gs} height={gs}>
          <g fill="#fff" style={MASK_WHITE}>
            {INK.map((l) => (
              <use key={l} href={layerHref[l]} />
            ))}
          </g>
          <g fill="#000" className={s.rimShift} style={MASK_BLACK}>
            {INK.map((l) => (
              <use key={l} href={layerHref[l]} />
            ))}
          </g>
        </mask>
        {/* Core shadow: the same trick from the other side, a soft band on the edge turned from the light. */}
        <mask id={`${id}-m-core`} maskUnits="userSpaceOnUse" x={g0} y={g1} width={gs} height={gs}>
          <g fill="#fff" style={MASK_WHITE}>
            {INK.map((l) => (
              <use key={l} href={layerHref[l]} />
            ))}
          </g>
          <g fill="#000" transform={`translate(${(vs / 110).toFixed(2)} ${(-vs / 150).toFixed(2)})`} style={MASK_BLACK}>
            {INK.map((l) => (
              <use key={l} href={layerHref[l]} />
            ))}
          </g>
        </mask>
        <linearGradient id={`${id}-ink`} gradientUnits="userSpaceOnUse" x1={vx + vs * 0.7} y1={vy} x2={vx + vs * 0.35} y2={vy + vs}>
          <stop offset="0" className={s.inkLit} />
          <stop offset=".5" className={s.inkMid} />
          <stop offset="1" className={s.inkCore} />
        </linearGradient>
      </defs>

      <g ref={bodyRef}>
      {!bare ? (
        <g>
          <ellipse
            cx={geo0.shadow.cx}
            cy={GROUND + 0.6}
            rx={geo0.shadow.rx}
            ry={5}
            fill={`url(#${id}-floor)`}
          />
          {geo0.feet.map((f, i) => (
            <ellipse
              key={i}
              cx={f[0]}
              cy={GROUND + 0.3}
              rx={12.5}
              ry={1.6}
              opacity={f[1]}
              className={i ? s.contactFar : s.contact}
            />
          ))}
        </g>
      ) : null}
      {motionD ? <path d={motionD} className={s.motion} strokeWidth={traceW * 0.62} strokeDasharray={`${(traceW * 1.6).toFixed(2)} ${(traceW * 2.2).toFixed(2)}`} /> : null}
      {!bare && move.extra === "breath" ? (
        <g transform={breathT(geo0)} className={s.breath}>
          <circle r={14} className={s.breathOuter} />
          <circle r={8.5} className={s.breathInner} />
        </g>
      ) : null}

      {ORDERS[order].map(layer)}

      {fine ? (
        <g mask={`url(#${id}-m-core)`} className={s.core}>
          {INK.map((l) => (
            <use key={l} href={layerHref[l]} mask={`url(#${id}-m-${l})`} />
          ))}
        </g>
      ) : null}
      {fine ? (
        <g mask={`url(#${id}-m-rim)`} className={s.rim}>
          {INK.map((l) => (
            <use key={l} href={layerHref[l]} mask={`url(#${id}-m-${l})`} />
          ))}
        </g>
      ) : null}
      </g>
      {live ? (
        <foreignObject x={vx} y={vy} width={vs} height={vs} aria-hidden>
          <canvas ref={canvasRef} className={s.canvas} />
        </foreignObject>
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
