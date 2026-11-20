"use client";

import { useState, type ReactNode } from "react";
import { cls } from "../util";
import "./preview.css";

const s = cls("gfx-pv");

/** Remounts its children so one-shot animations can be watched again. */
export function Replay({ children }: { children: ReactNode }) {
  const [n, setN] = useState(0);
  return (
    <div className={s.replay}>
      <div key={n} className={s.replayStage}>
        {children}
      </div>
      <button type="button" className={s.replayButton} onClick={() => setN((v) => v + 1)}>
        Replay
      </button>
    </div>
  );
}
