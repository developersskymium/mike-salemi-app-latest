"use client";

import {
  assessSetup,
  calibrate,
  framing,
  LM,
  steadiestPose,
  type BellDistance,
  type Calibration,
  type Framing,
  type Pose,
  type SetupAssessment,
} from "@ms/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Icon } from "@/components/ui";
import { SetupOverlay, type OverlayPoints } from "./Overlay";
import { loadPoseDetector, type PoseDetector } from "./pose";
import { SpeechToggle, useSpeech } from "./Sequence";

export interface CheckOutcome {
  assessment: SetupAssessment;
  aspect: number;
  bellDistance: BellDistance;
}

type Phase = "disclaimer" | "under18" | "place" | "camera" | "bell" | "stop";
type Stage = "loading" | "error" | "denied" | "frame" | "stand" | "ready" | "hold";

const STAND_MS = 2000;
const READY_S = 5;
const HOLD_MS = 3000;

/**
 * The Set-Up Check: disclaimer (once) → placement guide → live camera (frame → stand tall 2 s →
 * get set → hold 3 s) → the one Step 1 question the camera can't answer → scorecard.
 * Pose detection runs on the device; frames are never stored or sent.
 */
export function SetupCheck({
  needsDisclaimer,
  neckHistory,
  onAcceptDisclaimer,
  onDone,
  onExit,
}: {
  needsDisclaimer: boolean;
  neckHistory: boolean;
  onAcceptDisclaimer: () => void;
  onDone: (o: CheckOutcome) => void;
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(needsDisclaimer ? "disclaimer" : "place");
  const [adult, setAdult] = useState(false);
  const [held, setHeld] = useState<{ assessment: SetupAssessment; aspect: number; pose: Pose; cal: Calibration | null } | null>(null);
  const speech = useSpeech();

  if (phase === "stop") return <StopScreen onExit={onExit} />;

  return (
    <div className="sw-focus" data-shell-focus>
      <header className="sw-focus-top">
        <button type="button" className="sw-icon" aria-label="Close the check" onClick={onExit}><Icon name="close" size="sm" /></button>
        <p className="sw-focus-title">Set-Up Check</p>
        <SpeechToggle speech={speech} />
      </header>

      {phase === "disclaimer" && (
        <section className="sw-panel sw-narrow" aria-labelledby="sw-disc-h">
          <h1 id="sw-disc-h" className="sw-h1">Before your first check</h1>
          <p className="sw-body">This tool looks at your set-up, the held position before the first swing. It does not diagnose anything and it is not medical advice.</p>
          <ul className="sw-list">
            <li>Check with your doctor before starting any exercise program.</li>
            <li>If you feel pain, dizziness or shortness of breath, stop and see a professional.</li>
            <li>Use a bell you can control. The check only looks at your position, never the load.</li>
            <li>Your camera feed stays on this device. Only the measurements are saved to your account.</li>
          </ul>
          <label className="sw-adult">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            <span><b>I’m 18 or older.</b> The camera check is for adults only.</span>
          </label>
          <div className="sw-actions">
            <Button variant="filled" size="lg" disabled={!adult} onClick={() => { onAcceptDisclaimer(); setPhase("place"); }}>I understand, continue</Button>
            <Button variant="ghost" size="lg" onClick={() => setPhase("under18")}>I’m under 18</Button>
          </div>
        </section>
      )}

      {phase === "under18" && (
        <section className="sw-panel sw-narrow" aria-labelledby="sw-u18-h">
          <h1 id="sw-u18-h" className="sw-h1">The camera check is for 18 and over</h1>
          <p className="sw-body">You can still learn the set-up: Mike’s 7 step videos, the Approach, the Feet drill and the 2-week program are all open to you.</p>
          <div className="sw-actions"><Button variant="filled" size="lg" onClick={onExit}>Back to the coach</Button></div>
        </section>
      )}

      {phase === "place" && (
        <section className="sw-panel sw-place" aria-labelledby="sw-place-h">
          <PlacementArt />
          <div className="sw-place-text">
            <h1 id="sw-place-h" className="sw-h1">Set the phone side-on</h1>
            <ol className="sw-steps">
              <li><span><b>Hip height, 2–3 m away.</b> Prop the phone on a chair or a step, upright.</span></li>
              <li><span><b>Side-on.</b> The camera sees your side, with the bell in front of you.</span></li>
              <li><span><b>Whole body in frame,</b> head to feet. Fitted clothes and good light help.</span></li>
            </ol>
            <p className="sw-note">You’ll stand tall for 2 seconds first, then hold your set-up for 3. Nothing is recorded.</p>
            <div className="sw-actions">
              <Button variant="filled" size="lg" icon="video" onClick={() => setPhase("camera")}>Open the camera</Button>
            </div>
          </div>
        </section>
      )}

      {phase === "camera" && (
        <CameraStage
          speech={speech}
          neckHistory={neckHistory}
          onStop={() => setPhase("stop")}
          onHeld={(h) => {
            setHeld(h);
            setPhase("bell");
          }}
        />
      )}

      {phase === "bell" && held && (
        <section className="sw-panel sw-narrow" aria-labelledby="sw-bell-h">
          <p className="sw-kicker">Step 1 · Feet</p>
          <h1 id="sw-bell-h" className="sw-h1">Where was the bell?</h1>
          <p className="sw-body">The camera can’t measure the bell yet. Mike’s rule: the bell 0.5–1.5 ft (15–45 cm) in front of your toes.</p>
          <div className="sw-choices" role="radiogroup" aria-label="Bell distance">
            {([
              ["ok", "About a foot in front of my toes", "15–45 cm"],
              ["far", "Further than that", "More than 1.5 ft"],
              ["near", "Closer than that", "Under 6 inches"],
              ["unsure", "Not sure", "Skip this one"],
            ] as [BellDistance, string, string][]).map(([v, l, h]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={false}
                className="sw-choice"
                onClick={() => {
                  const assessment = assessSetup({ pose: held.pose, aspect: held.aspect, calibration: held.cal, neckHistory, bellDistance: v });
                  onDone({ assessment, aspect: held.aspect, bellDistance: v });
                }}
              >
                <b>{l}</b>
                <small>{h}</small>
                <Icon name="chevron" size="xs" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StopScreen({ onExit }: { onExit: () => void }) {
  return (
    <div className="sw-focus" data-shell-focus>
      <section className="sw-panel sw-narrow sw-stop" role="alert" aria-labelledby="sw-stop-h">
        <h1 id="sw-stop-h" className="sw-h1">Stop for today</h1>
        <p className="sw-body">Pain, dizziness or shortness of breath are signs to stop. Sit down, breathe, and see a professional before you train again. The check will be here when you’re ready.</p>
        <div className="sw-actions"><Button variant="filled" size="lg" onClick={onExit}>Back to the coach</Button></div>
      </section>
    </div>
  );
}

/** A side-on phone and a figure, so the placement reads at a glance. */
function PlacementArt() {
  return (
    <svg className="sw-place-art" viewBox="0 0 320 200" role="img" aria-label="Phone on a chair at hip height, 2 to 3 metres from you, side-on">
      <line x1="10" y1="178" x2="310" y2="178" className="sw-art-floor" />
      {/* figure in set-up, facing right */}
      <g className="sw-art-fig">
        <line x1="214" y1="176" x2="220" y2="140" />
        <line x1="220" y1="140" x2="196" y2="122" />
        <line x1="196" y1="122" x2="246" y2="96" />
        <line x1="246" y1="96" x2="262" y2="88" />
        <circle cx="270" cy="84" r="9" />
        <line x1="246" y1="98" x2="252" y2="150" />
      </g>
      <g className="sw-art-bell"><circle cx="262" cy="166" r="11" /><path d="M254 158 q8 -14 16 0" /></g>
      {/* chair + phone */}
      <g className="sw-art-chair"><line x1="40" y1="178" x2="40" y2="128" /><line x1="72" y1="178" x2="72" y2="128" /><line x1="34" y1="128" x2="78" y2="128" /></g>
      <rect x="50" y="98" width="16" height="30" rx="3" className="sw-art-phone" />
      <path d="M68 113 L188 92 M68 113 L188 176" className="sw-art-cone" />
      <line x1="58" y1="192" x2="214" y2="192" className="sw-art-dim" />
      <text x="136" y="188" textAnchor="middle" className="sw-art-label">2–3 m</text>
      <text x="58" y="88" textAnchor="middle" className="sw-art-label">hip height</text>
    </svg>
  );
}

const pick = (p: Pose, s: "left" | "right"): OverlayPoints => ({
  ear: p[LM.ear[s]]!,
  shoulder: p[LM.shoulder[s]]!,
  hip: p[LM.hip[s]]!,
  knee: p[LM.knee[s]]!,
  ankle: p[LM.ankle[s]]!,
});

function CameraStage({
  speech,
  neckHistory,
  onHeld,
  onStop,
}: {
  speech: ReturnType<typeof useSpeech>;
  neckHistory: boolean;
  onHeld: (h: { assessment: SetupAssessment; aspect: number; pose: Pose; cal: Calibration | null }) => void;
  onStop: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [stage, setStage] = useState<Stage>("loading");
  const [live, setLive] = useState<{ pose: Pose; f: Framing } | null>(null);
  const [count, setCount] = useState(0);
  const [aspect, setAspect] = useState(9 / 16);
  const [attempt, setAttempt] = useState(0);
  // Callbacks in refs, so a re-render (the voice toggle) never restarts the camera.
  const cb = useRef({ onHeld, neckHistory, say: speech.say });
  useEffect(() => {
    cb.current = { onHeld, neckHistory, say: speech.say };
  });
  const st = useRef({ stage: "loading" as Stage, okSince: 0, t0: 0, frames: [] as Pose[], cal: null as Calibration | null, lastSay: "" });
  const sayOnce = useCallback((t: string) => {
    if (st.current.lastSay === t) return;
    st.current.lastSay = t;
    cb.current.say(t);
  }, []);
  const go = useCallback((s: Stage) => {
    st.current.stage = s;
    st.current.t0 = performance.now();
    st.current.frames = [];
    setStage(s);
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let det: PoseDetector | null = null;
    let raf = 0;
    let alive = true;
    let lastT = 0;
    st.current.stage = "loading";
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch {
        if (alive) go("denied");
        return;
      }
      const v = video.current;
      if (!v || !alive) return;
      v.srcObject = stream;
      await v.play().catch(() => {});
      try {
        det = await loadPoseDetector();
      } catch {
        if (alive) go("error");
        return;
      }
      if (!alive) return;
      go("frame");
      const tick = (t: number) => {
        if (!alive) return;
        raf = requestAnimationFrame(tick);
        if (t - lastT < 66 || !det || !v.videoWidth) return; // ~15 fps is plenty for a held position
        lastT = t;
        const a = v.videoWidth / v.videoHeight;
        const pose = det.detect(v, t);
        const f = framing(pose, a);
        setAspect(a);
        setLive(pose ? { pose, f } : null);
        const s = st.current;
        const since = t - s.t0;
        if (s.stage === "frame") {
          if (f.ok) {
            if (!s.okSince) s.okSince = t;
            if (t - s.okSince > 1200) {
              sayOnce("Good. Stand tall.");
              go("stand");
            }
          } else {
            s.okSince = 0;
            if (f.hint) sayOnce(f.hint);
          }
        } else if (s.stage === "stand") {
          if (!f.ok || !pose) {
            s.okSince = 0;
            go("frame");
            return;
          }
          s.frames.push(pose);
          setCount(Math.ceil((STAND_MS - since) / 1000));
          if (since >= STAND_MS) {
            const best = steadiestPose(s.frames, 6);
            s.cal = best ? calibrate(best.pose, a) : null;
            if (!s.cal) {
              go("frame");
              return;
            }
            sayOnce("Now step up to the bell and take your set-up.");
            go("ready");
          }
        } else if (s.stage === "ready") {
          const left = Math.ceil(READY_S - since / 1000);
          setCount(left);
          if (left <= 0) {
            sayOnce("Hold it.");
            go("hold");
          }
        } else if (s.stage === "hold") {
          if (pose) s.frames.push(pose);
          setCount(Math.ceil((HOLD_MS - since) / 1000));
          if (since >= HOLD_MS) {
            const best = steadiestPose(s.frames, 8);
            alive = false;
            cancelAnimationFrame(raf);
            sayOnce("Done. Stand up and relax.");
            const p = best?.pose ?? pose ?? [];
            cb.current.onHeld({ assessment: assessSetup({ pose: p, aspect: a, calibration: s.cal, neckHistory: cb.current.neckHistory }), aspect: a, pose: p, cal: s.cal });
          }
        }
      };
      raf = requestAnimationFrame(tick);
    })();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [facingMode, attempt, go, sayOnce]);

  const mirror = facingMode === "user";
  const f = live?.f;
  const msg: Record<Stage, { title: string; sub?: string }> = {
    loading: { title: "Starting the camera", sub: "Loading the pose model on this phone. First time takes a few seconds." },
    error: { title: "The check couldn't start", sub: "The pose model didn't load. Check your connection and try again." },
    denied: { title: "Camera access is off", sub: "Allow the camera for this site in your browser settings, then try again." },
    frame: { title: f?.ok ? "Hold still, you're in frame" : (f?.hint ?? "Step into the frame, side-on to the phone.") },
    stand: { title: "Stand tall", sub: "Relaxed shoulders, eyes forward. This sets your baseline." },
    ready: { title: "Take your set-up", sub: "Step up to the bell: back, then down. Hands on the handle." },
    hold: { title: "Hold it", sub: "Stay still in your set-up." },
  };
  const m = msg[stage];
  const showCount = stage === "stand" || stage === "ready" || stage === "hold";

  return (
    <section className="sw-cam" aria-label="Camera">
      <div className="sw-cam-frame" data-ok={f?.ok ? "" : undefined} data-stage={stage} style={{ ["--sw-aspect" as string]: String(aspect) }}>
        <video ref={video} className="sw-cam-video" data-mirror={mirror ? "" : undefined} playsInline muted />
        {live && live.f.inFrame && <SetupOverlay points={pick(live.pose, live.f.side)} aspect={aspect} mirror={mirror} live status={live.f.ok ? { back: "good", shin: "good", hip: "good", head: "good" } : undefined} />}
        <div className="sw-cam-guide" aria-hidden><span /></div>
        <div className="sw-cam-chips">
          <span className="sw-cam-chip" data-on={f?.inFrame ? "" : undefined}><Icon name={f?.inFrame ? "check" : "fullscreen"} size="xs" /> Head to feet</span>
          <span className="sw-cam-chip" data-on={f?.sideOn && f?.inFrame ? "" : undefined}><Icon name={f?.sideOn && f?.inFrame ? "check" : "repeat"} size="xs" /> Side-on</span>
          <span className="sw-cam-chip" data-on={f && f.visibility >= 0.6 ? "" : undefined}><Icon name={f && f.visibility >= 0.6 ? "check" : "sun"} size="xs" /> Clear view</span>
        </div>
        {showCount && <span className="sw-cam-count" aria-hidden key={`${stage}-${count}`}>{Math.max(count, 0)}</span>}
      </div>
      <div className="sw-cam-bar">
        <div className="sw-cam-msg" aria-live="polite">
          <p className="sw-cam-title">{m.title}</p>
          {m.sub && <p className="sw-cam-sub">{m.sub}</p>}
        </div>
        <div className="sw-cam-tools">
          {(stage === "error" || stage === "denied") && <Button variant="filled" size="md" onClick={() => { setStage("loading"); setAttempt((n) => n + 1); }}>Try again</Button>}
          <Button variant="secondary" size="md" icon="repeat" onClick={() => { setStage("loading"); setLive(null); setFacingMode((x) => (x === "user" ? "environment" : "user")); }}>Switch camera</Button>
          <button type="button" className="sw-stoplink" onClick={onStop}>Pain or dizziness? Stop</button>
        </div>
      </div>
    </section>
  );
}
