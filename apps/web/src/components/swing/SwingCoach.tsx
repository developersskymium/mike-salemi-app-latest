"use client";

import { fixFor, startingBell, stepScore, SWING_STEPS } from "@ms/core";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Icon, useToast } from "@/components/ui";
import { acceptSwingDisclaimer, logSwingSession, saveSetupCheck, saveSetupProfile, startSwingProgram } from "@/lib/actions/swing";
import { PHOTO } from "@/lib/photos";
import { firstKg, lessonHref, type ProgramRun, type SavedCheck, type SetupProfile, type SwingHomeData } from "@/lib/swing";
import { approachSteps, feetSteps } from "./modes";
import { cueText } from "./Overlay";
import { PostureFigure } from "./PostureFigure";
import { ProfileFlow } from "./ProfileFlow";
import { ProgramHome } from "./Program";
import { Scorecard } from "./Scorecard";
import { SequencePlayer, SpeechToggle, useSpeech } from "./Sequence";
import { SetupCheck, type CheckOutcome } from "./SetupCheck";

export type SwingView = "home" | "profile" | "check" | "result" | "approach" | "feet" | "program";

const GOAL_LABEL = { learn: "Learn the set-up", fix: "Fix a known fault", program: "2-week program" } as const;

/**
 * Swing Set-Up Coach root: the tool home and its modes (profile, camera check, scorecard, Approach
 * ritual, Feet drill, 2-week program). One client component so modes switch instantly.
 */
export function SwingCoach({ data, initialView: asked, cameraAccess }: { data: SwingHomeData; initialView: SwingView; cameraAccess: boolean }) {
  // Without camera access the check opens as the locked home (guided modes stay open).
  const initialView: SwingView = asked === "check" && !cameraAccess ? "home" : asked;
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState<SetupProfile | null>(data.profile);
  const [checks, setChecks] = useState<SavedCheck[]>(data.checks);
  const [run, setRun] = useState<ProgramRun | null>(data.run);
  const [result, setResult] = useState<{ check: SavedCheck; saving: "saving" | "saved" | "preview" | "error" | null } | null>(
    initialView === "result" && data.checks[0] ? { check: data.checks[0], saving: null } : null,
  );
  // The profile comes first: a deep link to a mode asks the three questions, then opens it.
  const [after, setAfter] = useState<SwingView>(initialView === "profile" || initialView === "result" ? "home" : initialView);
  const [view, setView] = useState<SwingView>(!data.profile && initialView !== "home" && initialView !== "result" ? "profile" : initialView === "result" && !data.checks[0] ? "home" : initialView);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const kgFromProfile = firstKg(data.prefill.profileBells);
  const suggestedKg = profile?.bell_kg ?? startingBell({ selectorKg: data.prefill.selectorKg ?? kgFromProfile, sex: data.prefill.sex });
  const kgSource = data.prefill.selectorKg ? "your Kettlebell Selector result" : kgFromProfile ? "your training profile" : null;
  const neck = !!profile?.neck_history;
  const open = (v: SwingView) => {
    if (v === "check" && !cameraAccess) {
      document.getElementById("sw-locked")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!profile && v !== "home") {
      setAfter(v);
      setView("profile");
      return;
    }
    setView(v);
  };
  const home = () => {
    setView("home");
    router.replace("/tools/swing-setup", { scroll: false });
  };

  if (view === "profile")
    return (
      <ProfileFlow
        initial={profile}
        suggestedKg={suggestedKg}
        kgSource={kgSource}
        onClose={() => (profile ? setView("home") : home())}
        onSave={async (p) => {
          const next: SetupProfile = { ...p, disclaimer_at: profile?.disclaimer_at ?? null };
          setProfile(next);
          setView(after === "profile" ? "home" : after);
          const r = await saveSetupProfile(p);
          if (!r.ok) toast(r.error);
        }}
      />
    );

  if (view === "check")
    return (
      <SetupCheck
        needsDisclaimer={!profile?.disclaimer_at || !profile?.adult_confirmed_at}
        neckHistory={neck}
        onExit={() => setView("home")}
        onAcceptDisclaimer={() => {
          const now = new Date().toISOString();
          setProfile((p) => (p ? { ...p, disclaimer_at: now, adult_confirmed_at: now } : p));
          void acceptSwingDisclaimer(true);
        }}
        onDone={async (o: CheckOutcome) => {
          const check = toSaved(o, neck);
          setResult({ check, saving: "saving" });
          setView("result");
          const r = await saveSetupCheck({
            measures: { ...o.assessment.measures, aspect: o.aspect, neck_history: neck, bell_distance: o.bellDistance, overlay: o.assessment.overlay },
            steps: o.assessment.steps,
            faults: o.assessment.faults,
          });
          const saved = r.ok ? { ...check, id: r.data.id } : check;
          setResult({ check: saved, saving: r.ok ? "saved" : /Preview/.test(r.error) ? "preview" : "error" });
          setChecks((c) => [saved, ...c]);
        }}
      />
    );

  if (view === "result" && result)
    return <Scorecard check={result.check} bellKg={profile?.bell_kg ?? suggestedKg} saving={result.saving} onAgain={() => open("check")} onHome={home} />;

  if (view === "approach" || view === "feet") return <Guided kind={view} neck={neck} onExit={() => setView("home")} />;

  if (view === "program")
    return (
      <ProgramHome
        run={run}
        neck={neck}
        suggestedKg={suggestedKg}
        onExit={() => setView("home")}
        onStart={async (kg) => {
          const r = await startSwingProgram(kg);
          if (!r.ok && !/Preview/.test(r.error)) {
            toast(r.error);
            return null;
          }
          const next: ProgramRun = { id: r.ok ? r.data.id : "preview", bell_kg: kg, started_at: new Date().toISOString(), finished_at: null, sets: [] };
          setRun(next);
          return next;
        }}
        onLog={async (rn, session, sets) => {
          if (rn.id === "preview") {
            toast("Preview mode: this session isn't saved.");
            return;
          }
          const r = await logSwingSession({ runId: rn.id, session, sets, finish: session === 6 });
          toast(r.ok ? "Session saved" : r.error, r.ok ? { tone: "success" } : undefined);
        }}
      />
    );

  return (
    <Home
      cameraAccess={cameraAccess}
      profile={profile}
      checks={checks}
      run={run}
      suggestedKg={suggestedKg}
      onOpen={open}
      onResult={(c) => {
        setResult({ check: c, saving: null });
        setView("result");
      }}
    />
  );
}

function toSaved(o: CheckOutcome, neck: boolean): SavedCheck {
  return {
    id: "new",
    created_at: new Date().toISOString(),
    measures: { ...o.assessment.measures, aspect: o.aspect, neck_history: neck, bell_distance: o.bellDistance, overlay: o.assessment.overlay },
    steps: o.assessment.steps,
    main_fault: o.assessment.mainFault,
    faults: o.assessment.faults,
  };
}

/* ------------------------------------------------------------------ guided modes */

function Guided({ kind, neck, onExit }: { kind: "approach" | "feet"; neck: boolean; onExit: () => void }) {
  const speech = useSpeech();
  const [reps, setReps] = useState<number | null>(kind === "approach" ? 0 : null);
  const [done, setDone] = useState(false);
  const title = kind === "approach" ? "The Approach" : "Feet activation drill";
  return (
    <div className="sw-focus" data-shell-focus>
      <header className="sw-focus-top">
        <button type="button" className="sw-icon" aria-label={`Close ${title}`} onClick={onExit}><Icon name="close" size="sm" /></button>
        <p className="sw-focus-title">{title}</p>
        <SpeechToggle speech={speech} />
      </header>
      {done ? (
        <section className="sw-panel sw-narrow" aria-labelledby="sw-gd-h">
          <h1 id="sw-gd-h" className="sw-h1">{kind === "approach" ? "Now swing" : "Feet are awake"}</h1>
          <p className="sw-body sw-c2">{kind === "approach" ? "Rock back so the bell tips, hike it, and make the first rep look like the last." : "Take that tripod straight into your set-up."}</p>
          <div className="sw-actions">
            <Button variant="filled" size="lg" onClick={onExit}>Back to the coach</Button>
            <Button variant="ghost" size="lg" onClick={() => setDone(false)}>Run it again</Button>
          </div>
        </section>
      ) : reps === null ? (
        <section className="sw-panel sw-narrow" aria-labelledby="sw-reps-h">
          <h1 id="sw-reps-h" className="sw-h1">How many presses per foot?</h1>
          <p className="sw-body sw-c2">Mike’s range is 3–5. Each press is 5 seconds at 10–20% effort, then relax. Front foot, other foot, then both together.</p>
          <div className="sw-choices sw-choices-row" role="radiogroup" aria-label="Presses per foot">
            {[3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={false} className="sw-choice" onClick={() => setReps(n)}>
                <b>{n}×</b>
                <small>about {Math.round((n * 13 * 3 + 12) / 60)} min</small>
              </button>
            ))}
          </div>
          <Link href={lessonHref("feet")} className="sw-clip-lesson">Watch Mike’s tripod drill first <Icon name="chevron" size="xs" /></Link>
        </section>
      ) : (
        <SequencePlayer
          label={title}
          steps={kind === "approach" ? approachSteps(neck) : feetSteps(reps)}
          speech={speech}
          doneLabel="Finish"
          onDone={() => setDone(true)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ home */

function Home({
  cameraAccess,
  profile,
  checks,
  run,
  suggestedKg,
  onOpen,
  onResult,
}: {
  cameraAccess: boolean;
  profile: SetupProfile | null;
  checks: SavedCheck[];
  run: ProgramRun | null;
  suggestedKg: number;
  onOpen: (v: SwingView) => void;
  onResult: (c: SavedCheck) => void;
}) {
  const last = checks[0] ?? null;
  const lastFix = last?.main_fault ? fixFor(last.main_fault, !!last.measures.neck_history) : null;
  const photo = PHOTO.hinge;
  const sessionsDone = new Set((run?.sets ?? []).map((s) => s.session)).size;
  return (
    <div className="sw-page sw-home">
      <Link href="/tools" className="sw-back"><Icon name="back" size="xs" /> Tools</Link>
      <header className="sw-hero">
        <div className="sw-hero-text">
          <p className="sw-kicker">From <Link href={`/programs/what-your-kettlebell-swing-is-missing/course`}>What Your Kettlebell Swing Is Missing</Link></p>
          <h1 className="sw-display">Swing Set-Up Coach</h1>
          <p className="sw-lede">Film your set-up side-on. The coach measures it against Mike’s 7 steps and gives you one fix at a time, in his words, with the moment in his video that shows it.</p>
          {cameraAccess ? (
            <div className="sw-actions">
              <Button variant="filled" size="lg" icon="video" onClick={() => onOpen("check")}>Check my set-up</Button>
              <span className="sw-hero-meta">About 2 minutes · the video stays on your phone</span>
            </div>
          ) : (
            <div className="sw-locked" id="sw-locked">
              <span className="sw-locked-ic" aria-hidden><Icon name="lock" size="sm" /></span>
              <div className="sw-locked-body">
                <p className="sw-locked-title">The camera check is included with any plan</p>
                <p className="sw-locked-text">Film your set-up and get one fix at a time from Mike’s 7 steps. The Approach, the Feet drill and the 2-week program below are open to you now.</p>
              </div>
              <Button variant="filled" size="md" href="/pricing">See plans</Button>
            </div>
          )}
        </div>
        <div className="sw-hero-photo">
          <Image src={photo.src} alt={photo.alt} fill priority sizes="(min-width: 1024px) 420px, 100vw" style={{ objectFit: "cover", objectPosition: photo.focal }} />
        </div>
      </header>

      <div className="sw-home-grid">
        <section className="sw-card sw-last" aria-labelledby="sw-last-h">
          <div className="sw-last-fig sw-pfcard">
            {last ? <PostureFigure check={last} bellKg={profile?.bell_kg ?? suggestedKg} compact /> : <PostureFigure check={EMPTY_CHECK} bellKg={profile?.bell_kg ?? suggestedKg} compact />}
          </div>
          <div className="sw-last-body">
            {last ? (
              <>
                <h2 id="sw-last-h" className="sw-h3">Last check · {new Date(last.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</h2>
                <p className="sw-last-title">{lastFix ? lastFix.title : "Set-up on track"}</p>
                {lastFix && <p className="sw-quote">“{cueText(lastFix.cue)}”</p>}
                <Button variant="secondary" size="md" onClick={() => onResult(last)}>See the scorecard</Button>
              </>
            ) : (
              <>
                <h2 id="sw-last-h" className="sw-h3">No checks yet</h2>
                <p className="sw-body sw-c2">Your first check sets the baseline. Each one after shows whether the fix is sticking.</p>
              </>
            )}
          </div>
        </section>

        <Trend checks={checks} />
      </div>

      <section className="sw-modes" aria-labelledby="sw-modes-h">
        <h2 id="sw-modes-h" className="sw-h2">Guided, no camera</h2>
        <ul>
          <ModeRow icon="wind" title="The Approach" meta="2 min · before every set" text="Stand behind the bell, three belly breaths, picture the rep, step in, run the checklist." onClick={() => onOpen("approach")} />
          <ModeRow icon="steps" title="Feet activation drill" meta="2–4 min · Step 1" text="The tripod drill: lift and spread, set down, press 10–20% for 5 seconds, relax." onClick={() => onOpen("feet")} />
          <ModeRow
            icon="timer"
            title="2-Week Swing Program"
            meta={run && !run.finished_at ? `Session ${Math.min(sessionsDone + 1, 6)} of 6 · ${run.bell_kg} kg` : `6 sessions on the minute · start at ${suggestedKg} kg`}
            text="Six sessions on the minute, 8 to 14 swings, with the Approach in every rest."
            onClick={() => onOpen("program")}
          />
        </ul>
      </section>

      <section className="sw-profile" aria-label="Your answers">
        <p className="sw-c2">
          {profile ? (
            <>
              {profile.neck_history ? "Neck history: head advice stays neutral" : "No neck history"} · {profile.bell_kg ?? suggestedKg} kg {profile.bell_type === "competition" ? "competition bell" : "cast-iron bell"}
              {profile.goal ? ` · ${GOAL_LABEL[profile.goal]}` : ""}
            </>
          ) : (
            "Three quick questions come before your first check."
          )}
        </p>
        <Button variant="plain" size="sm" onClick={() => onOpen("profile")}>{profile ? "Change answers" : "Answer them now"}</Button>
      </section>
      <p className="sw-safety"><Icon name="info" size="xs" /> Pain, dizziness or shortness of breath: stop and see a professional. The coach comments on your set-up only.</p>
    </div>
  );
}

/** No check yet: the target set-up on its own. */
const EMPTY_CHECK: Pick<SavedCheck, "measures" | "steps" | "faults"> = {
  measures: { side: "right", sideOn: 0, visibility: 0, shin: null, hip: null, head: null, torsoRatio: null, gapRatio: null, calibrated: false, overlay: null },
  steps: { feet: "self", hips: "cant", back: "cant", shoulders: "cant", head: "cant", grip: "self", breath: "self" },
  faults: [],
};

function ModeRow({ icon, title, meta, text, onClick }: { icon: "wind" | "steps" | "timer"; title: string; meta: string; text: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" className="sw-mode" onClick={onClick}>
        <span className="sw-mode-ic" aria-hidden><Icon name={icon} size="sm" /></span>
        <span className="sw-mode-body">
          <b>{title}</b>
          <small>{meta}</small>
          <span className="sw-mode-text">{text}</span>
        </span>
        <Icon name="chevron" size="sm" className="sw-mode-go" />
      </button>
    </li>
  );
}

/** Consistency: each camera-checked step across the last checks (oldest → newest). */
function Trend({ checks }: { checks: SavedCheck[] }) {
  const recent = checks.slice(0, 8).reverse();
  const measured = SWING_STEPS.filter((s) => s.measured);
  return (
    <section className="sw-card sw-trend" aria-labelledby="sw-trend-h">
      <h2 id="sw-trend-h" className="sw-h3">Consistency</h2>
      {recent.length < 2 ? (
        <p className="sw-body sw-c2">After two checks you’ll see each step here over time. Mike’s standard: the first rep looks like the last.</p>
      ) : (
        <>
          <table className="sw-trend-table">
            <caption className="sw-sr">Step results over your last {recent.length} checks, oldest first</caption>
            <thead>
              <tr>
                <th scope="col"><span className="sw-sr">Step</span></th>
                {recent.map((c) => (
                  <th key={c.id} scope="col">{new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {measured.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{s.n} {s.title}</th>
                  {recent.map((c) => {
                    const v = c.steps[s.id];
                    const score = stepScore(v);
                    return (
                      <td key={c.id}>
                        <span className="sw-dot" data-status={v ?? "cant"} title={v === "good" ? "Good" : v === "adjust" ? "Adjust" : "Can't see it"}>
                          <span className="sw-sr">{score === 2 ? "Good" : score === 1 ? "Adjust" : "Can't see it"}</span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sw-trend-key"><span className="sw-dot" data-status="good" /> Good <span className="sw-dot" data-status="adjust" /> Adjust <span className="sw-dot" data-status="cant" /> Can’t see it</p>
        </>
      )}
    </section>
  );
}
