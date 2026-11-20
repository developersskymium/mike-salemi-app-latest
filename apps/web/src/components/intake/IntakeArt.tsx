import { Kettlebell, MovementFigure } from "@/components/graphics";

/**
 * Onboarding-grade scene illustrations for intake questions (Summit style: glacier, ember, ink on a
 * soft porcelain disc). One scene per question topic; `artFor` maps a question's text to a scene.
 */
export type ArtTopic =
  | "goal" | "experience" | "days" | "time" | "equipment" | "body" | "focus" | "level"
  | "coaching" | "notes" | "breath" | "plan" | "default";

const RULES: [ArtTopic, RegExp][] = [
  ["coaching", /describes you|who are you|your role|profession|coach others/i],
  ["focus", /movements?\b|lifts?\b|exercises?\b|skills?\b/i],
  ["body", /injur|pain|limit|health|condition|medical|hurt|surgery|pregnan|joint|back|knee|shoulder/i],
  ["days", /days?\b|week|often|frequen|schedule/i],
  ["time", /minute|long|time|session length|duration|hour/i],
  ["equipment", /equip|bell|weight|kg|lb|own|have to train|gear/i],
  ["breath", /breath|stress|sleep|energy|recover|mind|calm|feel/i],
  ["coaching", /coach|retreat|support|communit|call|mentor|help from|accountab/i],
  ["level", /level|strength|mobility|fitness|confiden|rate|how strong|condition|swing|get.?up|press|snatch|clean|squat/i],
  ["experience", /experience|trained|training history|background|how long have|years|new to|beginner/i],
  ["focus", /focus|area|improve|movement|skill|work on|interest/i],
  ["goal", /goal|why|want|matter|hope|achiev|motivat|aim|outcome|priorit/i],
  ["notes", /note|anything else|tell|share|comment|describe/i],
];

export function artFor(text: string, type?: string): ArtTopic {
  if (type === "text") return "notes";
  for (const [k, re] of RULES) if (re.test(text)) return k;
  return "default";
}

const G = "var(--accent)";
const E = "var(--warm)";
const INK = "var(--text)";
const SOFT = "var(--accent-soft)";

function Ground() {
  return (
    <>
      <defs>
        <radialGradient id="ia-disc" cx="50%" cy="38%" r="62%">
          <stop offset="0" stopColor="var(--surface)" />
          <stop offset="1" stopColor="var(--surface-sunk)" />
        </radialGradient>
        <clipPath id="ia-clip"><circle cx="120" cy="88" r="78" /></clipPath>
        <linearGradient id="ia-glacier" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--glacier-300, #7DBDEB)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
        <linearGradient id="ia-ember" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ember-300, #F9A27A)" />
          <stop offset="1" stopColor="var(--warm)" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="88" r="78" fill="url(#ia-disc)" />
      <circle cx="120" cy="88" r="78" fill="none" stroke="var(--line)" strokeWidth="1" />
    </>
  );
}

function Scene({ topic }: { topic: ArtTopic }) {
  switch (topic) {
    case "goal":
    case "plan":
    case "default":
      return (
        <g>
          {topic === "plan" && <g className="ia-rays" stroke={E} strokeWidth="2" strokeLinecap="round" opacity=".7">{[0, 1, 2, 3, 4, 5, 6].map((i) => { const a = (-180 + i * 30) * Math.PI / 180; return <line key={i} x1={152 + Math.cos(a) * 19} y1={56 + Math.sin(a) * 19} x2={152 + Math.cos(a) * 25} y2={56 + Math.sin(a) * 25} />; })}</g>}
          <circle cx="152" cy="56" r="12" fill="url(#ia-ember)" className="ia-sun" />
          <path d="M44 140 L96 66 L116 92 L134 70 L196 140 Z" fill="url(#ia-glacier)" />
          <path d="M96 66 L108 83 L101 80 L94 88 L88 78 Z" fill="var(--surface)" opacity=".92" />
          <path d="M134 70 L146 84 L139 82 L133 88 L127 80 Z" fill="var(--surface)" opacity=".85" />
          <path d="M30 150 L80 110 L110 134 L150 104 L210 150 Z" fill={INK} opacity=".9" />
          <path d="M66 140 C 80 124, 92 116, 98 98 S 96 76, 96 68" fill="none" stroke="var(--surface)" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" opacity=".9" />
          <g className="ia-flag"><line x1="96" y1="67" x2="96" y2="44" stroke={INK} strokeWidth="2" strokeLinecap="round" /><path d="M96 45 L114 50 L96 56 Z" fill={E} /></g>
        </g>
      );
    case "experience":
      return (
        <g>
          <path d="M52 140 H92 V122 H132 V104 H172 V86 H196 V140 Z" fill={SOFT} stroke="var(--line-strong)" strokeWidth="1" />
          {[{ x: 72, y: 122, s: .55, c: "var(--glacier-300, #7DBDEB)" }, { x: 112, y: 104, s: .75, c: G }, { x: 152, y: 86, s: 1, c: E }].map((k, i) => (
            <g key={i} transform={`translate(${k.x} ${k.y}) scale(${k.s})`} className="ia-pop" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <path d="M-11 -30 C -11 -44, 11 -44, 11 -30" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
              <path d="M-19 -6 C -19 -26, 19 -26, 19 -6 C 19 4, 12 0, 0 0 C -12 0, -19 4, -19 -6 Z" fill={k.c} />
              <ellipse cx="0" cy="-13" rx="19" ry="15" fill={k.c} />
              <ellipse cx="-6" cy="-18" rx="5" ry="3.5" fill="#fff" opacity=".35" />
            </g>
          ))}
          <path d="M60 70 Q 110 36 166 52" fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" opacity=".45" />
          <path d="M160 46 L168 52 L159 57" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".45" />
        </g>
      );
    case "days":
      return (
        <g>
          <rect x="54" y="42" width="132" height="98" rx="16" fill="var(--surface)" stroke="var(--line-strong)" />
          <path d="M54 58 a16 16 0 0 1 16 -16 h100 a16 16 0 0 1 16 16 v6 h-132 Z" fill="url(#ia-glacier)" />
          <line x1="84" y1="36" x2="84" y2="50" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <line x1="156" y1="36" x2="156" y2="50" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          {Array.from({ length: 14 }).map((_, i) => {
            const on = [0, 2, 4, 7, 9, 11].includes(i);
            return <circle key={i} cx={72 + (i % 7) * 16} cy={86 + Math.floor(i / 7) * 26} r={on ? 6 : 4} fill={on ? (i === 4 ? E : G) : "var(--line-strong)"} className={on ? "ia-pop" : undefined} style={on ? { animationDelay: `${80 + i * 40}ms` } : undefined} />;
          })}
        </g>
      );
    case "time":
      return (
        <g>
          <circle cx="120" cy="92" r="50" fill="var(--surface)" stroke="var(--line-strong)" />
          <circle cx="120" cy="92" r="40" fill="none" stroke="var(--surface-sunk)" strokeWidth="10" />
          <circle cx="120" cy="92" r="40" fill="none" stroke="url(#ia-ember)" strokeWidth="10" strokeLinecap="round" pathLength="100" strokeDasharray="50 100" transform="rotate(-90 120 92)" className="ia-arc" />
          {Array.from({ length: 12 }).map((_, i) => { const a = i * 30 * Math.PI / 180; return <line key={i} x1={120 + Math.sin(a) * 52} y1={92 - Math.cos(a) * 52} x2={120 + Math.sin(a) * 57} y2={92 - Math.cos(a) * 57} stroke={INK} strokeWidth={i % 3 ? 1 : 2} opacity=".5" />; })}
          <line x1="120" y1="92" x2="120" y2="64" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <line x1="120" y1="92" x2="138" y2="102" stroke={G} strokeWidth="3" strokeLinecap="round" />
          <circle cx="120" cy="92" r="4" fill={INK} />
          <rect x="112" y="30" width="16" height="8" rx="3" fill={INK} />
        </g>
      );
    case "body":
      return (
        <g>
          <circle cx="120" cy="40" r="11" fill="none" stroke={INK} strokeWidth="2.5" />
          <path d="M120 52 V100 M120 62 L96 86 M120 62 L144 86 M120 100 L104 140 M120 100 L136 140" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="120" cy="92" r="16" fill={E} opacity=".22" className="ia-pulse" />
          <circle cx="110" cy="122" r="11" fill={G} opacity=".22" className="ia-pulse" style={{ animationDelay: "600ms" }} />
          <circle cx="133" cy="66" r="10" fill={G} opacity=".22" className="ia-pulse" style={{ animationDelay: "1200ms" }} />
          <path d="M164 52 h14 M171 45 v14" stroke={E} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "level":
      return (
        <g>
          <path d="M60 120 A60 60 0 0 1 180 120" fill="none" stroke="var(--surface-sunk)" strokeWidth="14" strokeLinecap="round" />
          <path d="M60 120 A60 60 0 0 1 180 120" fill="none" stroke="url(#ia-glacier)" strokeWidth="14" strokeLinecap="round" pathLength="100" strokeDasharray="68 100" className="ia-arc" />
          {[0, 1, 2, 3, 4].map((i) => { const a = Math.PI + i * Math.PI / 4; return <circle key={i} cx={120 + Math.cos(a) * 44} cy={120 + Math.sin(a) * 44} r="2" fill={INK} opacity=".4" />; })}
          <g className="ia-needle"><line x1="120" y1="120" x2="146" y2="84" stroke={E} strokeWidth="4" strokeLinecap="round" /></g>
          <circle cx="120" cy="120" r="7" fill={INK} />
        </g>
      );
    case "coaching":
      return (
        <g>
          <path d="M36 140 L84 92 L104 110 L130 84 L204 140 Z" fill="url(#ia-glacier)" opacity=".85" />
          <path d="M92 140 L118 108 L144 140 Z" fill={E} />
          <path d="M118 108 L124 140 H112 Z" fill={INK} opacity=".8" />
          <rect x="128" y="40" width="60" height="34" rx="12" fill="var(--surface)" stroke="var(--line-strong)" />
          <path d="M140 74 L136 84 L150 74" fill="var(--surface)" stroke="var(--line-strong)" strokeLinejoin="round" />
          {[146, 158, 170].map((x, i) => <circle key={x} cx={x} cy="57" r="3" fill={i === 1 ? E : G} className="ia-pop" style={{ animationDelay: `${200 + i * 120}ms` }} />)}
          <circle cx="66" cy="54" r="10" fill="url(#ia-ember)" />
        </g>
      );
    case "notes":
      return (
        <g>
          <rect x="70" y="36" width="96" height="112" rx="12" fill="var(--surface)" stroke="var(--line-strong)" transform="rotate(-4 118 92)" />
          {[62, 78, 94, 110].map((y, i) => <line key={y} x1="86" y1={y} x2={i === 3 ? 124 : 148} y2={y - 3} stroke={i === 0 ? G : "var(--line-strong)"} strokeWidth="4" strokeLinecap="round" />)}
          <g transform="rotate(38 160 110)"><rect x="152" y="70" width="14" height="62" rx="4" fill={E} /><path d="M152 132 L159 146 L166 132 Z" fill={INK} /></g>
        </g>
      );
    default:
      return null;
  }
}

export function IntakeArt({ topic, move }: { topic: ArtTopic; move?: "swing" | "getup" | "breathing" | "press" }) {
  if (topic === "equipment") {
    return (
      <div className="ia" data-topic={topic} aria-hidden>
        <svg viewBox="0 0 240 176" className="ia-bg"><Ground /></svg>
        <div className="ia-bells">
          {[12, 16, 24].map((w, i) => (
            <span key={w} className="ia-pop" style={{ animationDelay: `${100 + i * 90}ms` }}><Kettlebell size={52 + i * 20} weight={w} colorCoded /></span>
          ))}
        </div>
      </div>
    );
  }
  if (topic === "focus" || topic === "breath") {
    return (
      <div className="ia" data-topic={topic} aria-hidden>
        <svg viewBox="0 0 240 176" className="ia-bg"><Ground /><circle cx="120" cy="88" r="50" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="2 6" opacity=".5" /></svg>
        <div className="ia-fig"><MovementFigure move={move ?? (topic === "breath" ? "breathing" : "swing")} size={138} animated trace /></div>
      </div>
    );
  }
  return (
    <div className="ia" data-topic={topic} aria-hidden>
      <svg viewBox="0 0 240 176" className="ia-bg"><Ground />{["goal", "plan", "default", "coaching"].includes(topic) ? <g clipPath="url(#ia-clip)"><Scene topic={topic} /></g> : <Scene topic={topic} />}<circle cx="120" cy="88" r="78" fill="none" stroke="var(--line)" /></svg>
    </div>
  );
}
