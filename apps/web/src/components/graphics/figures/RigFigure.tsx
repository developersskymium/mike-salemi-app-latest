"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import "../gfx.css";
import "./RigFigure.css";
import { cls, cx, useGfxId } from "../util";
import { BELL_OUTLINE, BELL_WINDOW } from "./bell";
import { STUDY_MOVES } from "./library";
import { bellTrace, duration, geoAt, GROUND, type Geo, type MoveDef, type Order } from "./rig";

const g = cls("gfx");
const s = cls("gfx-rig");

type LayerName = "far" | "torso" | "legN" | "bell" | "armN" | "hand";

const ORDERS: Record<Order, LayerName[]> = {
  out: ["far", "torso", "legN", "bell", "armN", "hand"],
  over: ["far", "torso", "legN", "armN", "bell", "hand"],
  between: ["far", "torso", "bell", "armN", "hand", "legN"],
};

/** Which shapes cut a hairline gap into a layer when they sit above it. */
function cutters(layer: LayerName, order: Order): LayerName[] {
  const list = ORDERS[order];
  const above = list.slice(list.indexOf(layer) + 1);
  // The hand grows out of the forearm: never part them.
  return above.filter((l) => !(layer === "armN" && l === "hand") && !(layer === "bell" && l === "hand"));
}

export type RigMoveName = keyof typeof STUDY_MOVES;

export interface RigFigureProps {
  move: MoveDef | RigMoveName;
  size?: number;
  /** Loop the movement (reduced motion shows the still). */
  animated?: boolean;
  /** Freeze at this loop phase, 0..1. */
  at?: number;
  speed?: number;
  /** Limb girth multiplier. */
  weight?: number;
  /** Hide the floor shadow and trace. */
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
  "torso",
  "neck",
  "head",
  "nThigh",
  "nShin",
  "nFoot",
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
    torso: geo.torso,
    neck: geo.neck,
    head: geo.head,
    nThigh: geo.legN.thigh,
    nShin: geo.legN.shin,
    nFoot: geo.legN.foot,
    nThighCut: geo.legN.thighCut,
    nUpper: geo.armN.upper,
    nFore: geo.armN.fore,
    nUpperCut: geo.armN.upperCut,
    nHand: geo.handN,
  };
}

/**
 * A coach-grade movement illustration: a filled, softly modelled athlete on a
 * real rig (true limb lengths, planted feet, hands on the handle), the bell as
 * the single accent. Server-renders the still; animates on the client.
 */
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
  const move = typeof moveProp === "string" ? STUDY_MOVES[moveProp] : moveProp;
  const phase0 = at ?? move.still;
  const geo0 = useMemo(() => geoAt(move, phase0, weight), [move, phase0, weight]);
  const [order, setOrder] = useState<Order>(geo0.order);
  const refs = useRef<Partial<Record<PathName | "bellA" | "bellS" | "shadow", SVGElement | null>>>({});
  const svgRef = useRef<SVGSVGElement | null>(null);
  const showTrace = (trace ?? !!move.trace) && !bare;
  const tracePath = useMemo(() => (showTrace ? bellTrace(move) : ""), [move, showTrace]);
  const [vx, vy, vs] = move.view ?? [0, 0, 240];
  // A hairline gap of about 0.9 px at any size, never thinner than 2.2 units.
  const gap = Math.max(1.3, Math.min(6, (vs / size) * 1.0));

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
    let start = performance.now() - phase0 * duration(move) * 1000 / speed;
    let last = geo0.order;
    const T = (duration(move) * 1000) / speed;

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
      if (geo.order !== last) {
        last = geo.order;
        setOrder(geo.order);
      }
    };
    const tick = (now: number) => {
      raf = 0;
      if (!visible || mq.matches) return;
      const t = ((now - start) % T) / T;
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
        apply(geo0);
      } else {
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
  }, [animated, at, move, phase0, speed, weight, geo0]);

  const d0 = dOf(geo0);
  const P = (name: PathName) => <path id={`${id}-${name}`} ref={(el) => void (refs.current[name] = el)} d={d0[name]} suppressHydrationWarning />;
  const use = (name: PathName) => <use href={`#${id}-${name}`} />;
  const layerHref: Record<LayerName, string> = {
    far: `#${id}-g-far`,
    torso: `#${id}-g-torso`,
    legN: `#${id}-g-legN`,
    bell: `#${id}-g-bellS`,
    armN: `#${id}-g-armN`,
    hand: `#${id}-g-hand`,
  };
  /** Cutter shapes: the torso is only cut by the distal parts of the near limbs, so shoulders and hips stay joined. */
  const cutHref = (cutter: LayerName, layer: LayerName) => {
    if (layer === "torso" && cutter === "legN") return `#${id}-g-legNc`;
    if (layer === "torso" && cutter === "armN") return `#${id}-g-armNc`;
    return layerHref[cutter];
  };
  const MASKED: LayerName[] = ["far", "torso", "legN", "bell", "armN", "hand"];
  const ALL: LayerName[] = ["torso", "legN", "bell", "armN", "hand"];
  const hasBell = !!geo0.bell;
  const [g0, g1, gs] = [vx - 20, vy - 20, vs + 40];

  const layer = (name: LayerName) => {
    if (name === "bell") {
      if (!hasBell) return null;
      return (
        <g key="bell" mask={`url(#${id}-m-bell)`}>
          <g ref={(el) => void (refs.current.bellA = el)} transform={geo0.bell ?? undefined} className={s.bell} suppressHydrationWarning>
            <path d={BELL_OUTLINE + BELL_WINDOW} fillRule="evenodd" fill={`url(#${id}-bell)`} />
            <path d="M-6.2 15.6A9 9 0 0 1 1.6 11.6" className={s.bellSpec} />
            <path d="M-3.4-.4H3.4" className={s.bellSheen} />
          </g>
        </g>
      );
    }
    return (
      <use
        key={name}
        href={layerHref[name]}
        mask={`url(#${id}-m-${name})`}
        className={name === "far" ? s.far : s.ink}
      />
    );
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
        <radialGradient id={`${id}-bell`} cx=".34" cy=".52" r=".75">
          <stop offset="0" className={s.bellHi} />
          <stop offset=".55" className={s.bellMid} />
          <stop offset="1" className={s.bellLo} />
        </radialGradient>
        <g id={`${id}-g-far`}>
          {P("farThigh")}
          {P("farShin")}
          {P("farFoot")}
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
        </g>
        <g id={`${id}-g-legNc`}>
          {P("nThighCut")}
          {use("nShin")}
          {use("nFoot")}
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
          const on = cutters(m, order);
          return (
            <mask key={m} id={`${id}-m-${m}`} maskUnits="userSpaceOnUse" x={g0} y={g1} width={gs} height={gs}>
              <rect x={g0} y={g1} width={gs} height={gs} fill="#fff" />
              <g fill="#000" stroke="#000" strokeWidth={gap * 2} strokeLinejoin="round">
                {(m === "far" ? ALL : on).map((c) =>
                  c === "bell" && !hasBell ? null : <use key={c} href={cutHref(c, m)} />,
                )}
              </g>
            </mask>
          );
        })}
      </defs>

      {!bare ? (
        <ellipse
          ref={(el) => void (refs.current.shadow = el)}
          cx={geo0.shadow.cx}
          cy={GROUND + 0.5}
          rx={geo0.shadow.rx}
          ry={2.6}
          className={s.shadow}
          suppressHydrationWarning
        />
      ) : null}
      {tracePath ? <path d={tracePath} className={s.trace} suppressHydrationWarning /> : null}

      {ORDERS[order].map(layer)}

      {debug ? (
        <g className={s.debug}>
          {Object.entries(geo0.joints).map(([k, v]) => (
            <circle key={k} cx={v[0]} cy={v[1]} r={1.6} />
          ))}
          <path d={`M0 ${GROUND}H240`} />
        </g>
      ) : null}
    </svg>
  );
}
