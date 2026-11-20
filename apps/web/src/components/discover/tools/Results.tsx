import { Glass, Icon, StepSegments } from "@/components/ui";
import { competitionColour, Kettlebell, MovementFigure, ReadinessDial, type MoveName } from "@/components/graphics";
import type { ReadinessResult, RoadmapResult, SelectorResult, StretchResult, ToolResultView } from "./defs";

export function ResultVisual({ result }: { result: ToolResultView }) {
  switch (result.kind) {
    case "selector":
      return <Bells r={result} />;
    case "stretch":
      return <Stretch r={result} />;
    case "readiness":
      return <Readiness r={result} />;
    case "roadmap":
      return <Roadmap r={result} />;
  }
}

/** The three bells, drawn to scale, lightest first; the first carries its weight and the "Start here" mark. */
function Bells({ r }: { r: SelectorResult }) {
  return (
    <div className="dsc-res">
      <div className="dsc-bells" role="list" aria-label="Your kettlebell set">
        {r.bells.map((b, i) => {
          const exact = /^\d+$/.test(b.label);
          // Competition bells are the same size at every weight; the colour tells them apart.
          const h = 124;
          return (
            <div key={i} className="dsc-bell" role="listitem" data-first={i === 0 ? "" : undefined} style={{ ["--d" as string]: `${i * 110}ms` }}>
              <div className="dsc-bell-mark">
                {exact ? (
                  <Kettlebell size={h} variant="competition" weight={b.size} title={`${b.label} kg kettlebell`} />
                ) : (
                  <span className="dsc-bell-range">
                    <Kettlebell size={h} variant="competition" weight={Number.parseInt(b.label, 10) || b.size} hideWeight title={`${b.label} kg kettlebell`} />
                    <span className="dsc-bell-label lq-num" style={{ fontSize: Math.round(h * (b.label.length > 3 ? 0.12 : 0.16)), top: "62%", color: competitionColour(Number.parseInt(b.label, 10) || b.size).ink }} aria-hidden>
                      {b.label}
                      <small>kg</small>
                    </span>
                  </span>
                )}
              </div>
              <div className="lq-t13 lq-c2">{["First bell", "Working bell", "Heavy bell"][i]}</div>
              {i === 0 && <span className="lq-chip" data-variant="tint">Start here</span>}
            </div>
          );
        })}
      </div>
      <ul className="dsc-notes">
        {r.notes.map((n) => (
          <li key={n} className="lq-t15">
            <Icon name="check" size="xs" className="lq-c2" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TEST_MOVE: Record<string, MoveName> = { "Toe touch": "deadlift", "Deep squat": "squat", "Overhead reach": "press", Ankle: "lunge", "T-spine rotation": "halo" };

/** Mobility profile: one row per test with a segmented range bar. */
function Stretch({ r }: { r: StretchResult }) {
  return (
    <div className="dsc-res">
      <Glass radius="card" className="dsc-profile">
        {r.tests.map((t) => (
          <div key={t.label} className="dsc-profile-row">
            <span className="dsc-profile-fig" aria-hidden>
              <MovementFigure move={TEST_MOVE[t.label] ?? "squat"} size={44} />
            </span>
            <span className="dsc-profile-text">
              <span className="lq-t15">{t.label}</span>
              <span className="lq-t12 lq-c2 dsc-clamp1">{t.answer}</span>
            </span>
            <StepSegments total={t.max} done={t.score} current={t.score} currentProgress={0} label={`${t.label}: ${t.score} of ${t.max}`} className="dsc-profile-bar" />
          </div>
        ))}
        <div className="dsc-profile-total lq-t13 lq-c2">
          Mobility score <b className="lq-num">{r.score}</b>/<span className="lq-num">{r.max}</span>
        </div>
      </Glass>
      <ul className="dsc-notes">
        {r.points.map((n) => (
          <li key={n} className="lq-t15">
            <Icon name="check" size="xs" className="lq-c2" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Readiness({ r }: { r: ReadinessResult }) {
  return (
    <div className="dsc-res">
      <div className="dsc-dial">
        <ReadinessDial score={r.score} max={r.max} band={r.band} zones={r.zones} size={280} />
        <p className="lq-t13 lq-c2 dsc-dial-score">
          Score <span className="lq-num">{r.score}</span> of <span className="lq-num">{r.max}</span>. Lower means fresher.
        </p>
      </div>
    </div>
  );
}

const PHASE_MOVE: MoveName[] = ["squat", "swing", "clean", "getup"];

function Roadmap({ r }: { r: RoadmapResult }) {
  return (
    <div className="dsc-res">
      <ol className="dsc-track" aria-label="Kettlebell Roadmap phases">
        {r.phases.map((p, i) => (
          <li key={p.label} data-s={i < r.phase ? "done" : i === r.phase ? "now" : undefined} aria-current={i === r.phase ? "step" : undefined}>
            <span className="dsc-track-dot" aria-hidden>{i < r.phase ? <Icon name="check" size="xs" /> : i + 1}</span>
            <span className="lq-t12 dsc-track-l">{p.label}</span>
            <span className="lq-t11 lq-c2 dsc-track-n">{p.name}</span>
          </li>
        ))}
      </ol>
      <div className="dsc-road">
        <Glass radius="card" className="dsc-road-card">
          <span className="dsc-road-fig" aria-hidden>
            <MovementFigure move={PHASE_MOVE[r.phase] ?? "swing"} size={92} animated />
          </span>
          <div>
            <h3 className="lq-t17">The lifts to own</h3>
            <ul className="dsc-notes dsc-notes-tight">
              {r.movements.map((m) => (
                <li key={m} className="lq-t15">
                  <Icon name="kettlebell" size="xs" className="lq-c2" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </Glass>
        {r.skills.length > 0 && (
          <Glass radius="card" className="dsc-road-card dsc-road-skills">
            <h3 className="lq-t17">Skills you’ll build</h3>
            <ul className="dsc-notes dsc-notes-tight">
              {r.skills.map((m) => (
                <li key={m} className="lq-t15">
                  <Icon name="sparkle" size="xs" className="lq-c2" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </Glass>
        )}
      </div>
    </div>
  );
}
