/**
 * Minimal SVG "UI mock" cover art. Purely decorative, drawn with theme tokens
 * so they stay on-palette in light and dark mode.
 */

type MockProps = { className?: string };

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 320 180"
      role="presentation"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="320" height="180" fill="var(--color-secondary)" />
      {children}
    </svg>
  );
}

/** Stacked day rows — the self-guided program map. */
export function MockProgramMap({ className }: MockProps) {
  return (
    <Frame className={className}>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(28 ${30 + i * 42})`}>
          <rect width="264" height="30" rx="8" fill="var(--color-background)" />
          <rect x="10" y="10" width="10" height="10" rx="3" fill={i === 0 ? "var(--color-primary)" : "var(--color-border)"} />
          <rect x="30" y="11" width={i === 0 ? 120 : 92} height="8" rx="4" fill="var(--color-border)" />
          <rect x="216" y="11" width="38" height="8" rx="4" fill="var(--color-border)" opacity="0.6" />
        </g>
      ))}
    </Frame>
  );
}

/** Thumbnail grid — the video library. */
export function MockVideoGrid({ className }: MockProps) {
  return (
    <Frame className={className}>
      {[0, 1, 2, 3].map((i) => {
        const x = 28 + (i % 4) * 68;
        return (
          <g key={i} transform={`translate(${x} 40)`}>
            <rect width="56" height="74" rx="8" fill="var(--color-background)" />
            <circle cx="28" cy="32" r="10" fill={i === 1 ? "var(--color-primary)" : "var(--color-border)"} />
            <path d="M25 27 l8 5 -8 5 z" fill="var(--color-secondary)" />
            <rect x="10" y="52" width="36" height="6" rx="3" fill="var(--color-border)" />
            <rect x="10" y="62" width="22" height="6" rx="3" fill="var(--color-border)" opacity="0.6" />
          </g>
        );
      })}
    </Frame>
  );
}

/** Question card with options — the tool flow. */
export function MockQuestionCard({ className }: MockProps) {
  return (
    <Frame className={className}>
      <rect x="28" y="24" width="264" height="132" rx="12" fill="var(--color-background)" />
      <rect x="44" y="40" width="70" height="7" rx="3.5" fill="var(--color-primary)" />
      <rect x="44" y="56" width="150" height="9" rx="4.5" fill="var(--color-border)" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(44 ${80 + i * 26})`}>
          <rect
            width="232"
            height="20"
            rx="10"
            fill="none"
            stroke={i === 1 ? "var(--color-primary)" : "var(--color-border)"}
            strokeWidth={i === 1 ? 2 : 1}
          />
          <circle cx="14" cy="10" r="4" fill={i === 1 ? "var(--color-primary)" : "var(--color-border)"} />
          <rect x="26" y="6" width={i === 1 ? 110 : 78} height="7" rx="3.5" fill="var(--color-border)" />
        </g>
      ))}
    </Frame>
  );
}

/** Result gauge — the tool outcome. */
export function MockResultGauge({ className }: MockProps) {
  return (
    <Frame className={className}>
      <rect x="28" y="24" width="264" height="132" rx="12" fill="var(--color-background)" />
      <path d="M84 118 a56 56 0 0 1 112 0" fill="none" stroke="var(--color-border)" strokeWidth="12" strokeLinecap="round" />
      <path
        d="M84 118 a56 56 0 0 1 78 -53"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <rect x="212" y="60" width="56" height="8" rx="4" fill="var(--color-border)" />
      <rect x="212" y="76" width="40" height="8" rx="4" fill="var(--color-border)" opacity="0.6" />
      <rect x="212" y="100" width="56" height="18" rx="9" fill="var(--color-primary)" opacity="0.18" />
    </Frame>
  );
}

export const toolMocks = [MockQuestionCard, MockResultGauge];

/* ---------------------------------------------------------------------------
 * Per-tool cover art. Each mock hints at what the tool measures.
 * ------------------------------------------------------------------------ */

/** Bell sizes ascending — kettlebell selector. */
export function MockBellScale({ className }: MockProps) {
  return (
    <Frame className={className}>
      <rect x="28" y="24" width="264" height="132" rx="12" fill="var(--color-background)" />
      {[0, 1, 2, 3].map((i) => {
        const size = 16 + i * 9;
        const x = 62 + i * 60;
        const active = i === 2;
        return (
          <g key={i}>
            <circle cx={x} cy={116 - size / 2} r={size / 2} fill={active ? "var(--color-primary)" : "var(--color-border)"} opacity={active ? 1 : 0.55} />
            <rect x={x - 7} y={116 - size - 10} width="14" height="12" rx="6" fill="none" stroke={active ? "var(--color-primary)" : "var(--color-border)"} strokeWidth="3" />
            <rect x={x - 14} y="128" width="28" height="6" rx="3" fill="var(--color-border)" opacity="0.5" />
          </g>
        );
      })}
    </Frame>
  );
}

/** Body ranges as horizontal bars — stretch test. */
export function MockRangeBars({ className }: MockProps) {
  return (
    <Frame className={className}>
      <rect x="28" y="24" width="264" height="132" rx="12" fill="var(--color-background)" />
      {[0.82, 0.5, 0.66, 0.34].map((v, i) => (
        <g key={i} transform={`translate(48 ${46 + i * 26})`}>
          <rect width="224" height="10" rx="5" fill="var(--color-border)" opacity="0.5" />
          <rect width={224 * v} height="10" rx="5" fill="var(--color-primary)" opacity={i === 0 ? 1 : 0.45 + v * 0.4} />
        </g>
      ))}
    </Frame>
  );
}

/** Sleep/stress dial rings — readiness check. */
export function MockReadinessRings({ className }: MockProps) {
  return (
    <Frame className={className}>
      <rect x="28" y="24" width="264" height="132" rx="12" fill="var(--color-background)" />
      {[44, 33, 22].map((r, i) => (
        <g key={r} transform="translate(104 90)">
          <circle r={r} fill="none" stroke="var(--color-border)" strokeWidth="8" opacity="0.5" />
          <circle
            r={r}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity={1 - i * 0.25}
            strokeDasharray={`${2 * Math.PI * r * (0.7 - i * 0.18)} ${2 * Math.PI * r}`}
            transform="rotate(-90)"
          />
        </g>
      ))}
      <rect x="188" y="66" width="72" height="8" rx="4" fill="var(--color-border)" />
      <rect x="188" y="84" width="48" height="8" rx="4" fill="var(--color-border)" opacity="0.6" />
      <rect x="188" y="104" width="64" height="18" rx="9" fill="var(--color-primary)" opacity="0.18" />
    </Frame>
  );
}

/** Five position checkboxes — movement screen. */
export function MockScreenChecklist({ className }: MockProps) {
  return (
    <Frame className={className}>
      <rect x="28" y="24" width="264" height="132" rx="12" fill="var(--color-background)" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(48 ${44 + i * 26})`}>
          <rect width="18" height="18" rx="6" fill="none" stroke={i < 2 ? "var(--color-primary)" : "var(--color-border)"} strokeWidth="2" />
          {i < 2 && <path d="M5 9 l3.5 4 L14 6" fill="none" stroke="var(--color-primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
          <rect x="30" y="5" width={i < 2 ? 150 : 110} height="8" rx="4" fill="var(--color-border)" opacity={i < 2 ? 0.9 : 0.55} />
        </g>
      ))}
    </Frame>
  );
}

/** Hand + timer arc — grip & carry. */
export function MockGripTimer({ className }: MockProps) {
  return (
    <Frame className={className}>
      <rect x="28" y="24" width="264" height="132" rx="12" fill="var(--color-background)" />
      <circle cx="104" cy="90" r="40" fill="none" stroke="var(--color-border)" strokeWidth="10" opacity="0.5" />
      <circle
        cx="104"
        cy="90"
        r="40"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${2 * Math.PI * 40 * 0.62} ${2 * Math.PI * 40}`}
        transform="rotate(-90 104 90)"
      />
      <rect x="98" y="72" width="12" height="26" rx="6" fill="var(--color-primary)" opacity="0.35" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="176" y={64 + i * 22} width={i === 0 ? 88 : 62} height="10" rx="5" fill="var(--color-border)" opacity={i === 0 ? 0.9 : 0.5} />
      ))}
    </Frame>
  );
}

/** Breath waveform — breath & conditioning. */
export function MockBreathWave({ className }: MockProps) {
  return (
    <Frame className={className}>
      <rect x="28" y="24" width="264" height="132" rx="12" fill="var(--color-background)" />
      <path
        d="M48 90 q22 -40 44 0 t44 0 t44 0 t44 0 t44 0"
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M48 90 q22 -40 44 0 t44 0"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="136" cy="90" r="7" fill="var(--color-primary)" />
      <rect x="48" y="124" width="80" height="8" rx="4" fill="var(--color-border)" opacity="0.6" />
    </Frame>
  );
}

/** Metronome ticks — swing tempo. */
export function MockTempoTicks({ className }: MockProps) {
  return (
    <Frame className={className}>
      <rect x="28" y="24" width="264" height="132" rx="12" fill="var(--color-background)" />
      {Array.from({ length: 11 }).map((_, i) => {
        const active = i % 3 === 0;
        const h = active ? 62 : 34;
        return (
          <rect
            key={i}
            x={52 + i * 22}
            y={110 - h}
            width="8"
            height={h}
            rx="4"
            fill={active ? "var(--color-primary)" : "var(--color-border)"}
            opacity={active ? 1 : 0.55}
          />
        );
      })}
      <rect x="52" y="124" width="96" height="8" rx="4" fill="var(--color-border)" opacity="0.6" />
    </Frame>
  );
}

/** Ascending load steps — load progression. */
export function MockLoadSteps({ className }: MockProps) {
  return (
    <Frame className={className}>
      <rect x="28" y="24" width="264" height="132" rx="12" fill="var(--color-background)" />
      {[0, 1, 2, 3, 4].map((i) => {
        const h = 20 + i * 18;
        return (
          <rect
            key={i}
            x={56 + i * 44}
            y={128 - h}
            width="30"
            height={h}
            rx="7"
            fill={i === 4 ? "var(--color-primary)" : "var(--color-border)"}
            opacity={i === 4 ? 1 : 0.4 + i * 0.12}
          />
        );
      })}
      <path d="M56 40 L256 40" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="4 6" opacity="0.5" />
    </Frame>
  );
}

export const toolMockBySlug: Record<string, React.FC<MockProps>> = {
  "kettlebell-selector": MockBellScale,
  "stretch-test": MockRangeBars,
  "recovery-check": MockReadinessRings,
  "movement-screen": MockScreenChecklist,
  "grip-test": MockGripTimer,
  "breath-test": MockBreathWave,
  "swing-tempo": MockTempoTicks,
  "load-progression": MockLoadSteps,
};
