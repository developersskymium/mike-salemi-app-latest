"use client";

import { useTransition } from "react";
import { Button, Icon, Sheet, useToast } from "@/components/ui";
import { restartPathAction } from "@/lib/actions/training";

const RESETS = ["Every day and step tick", "Day locks, back to the first day", "Where you left each video"];
const KEPT = ["Readiness history", "Certificates you've earned", "Points, medals and streaks", "This run in your history"];

/** Restart a level/course with a clear "what resets / what's remembered" confirmation → `restart_path`. */
export function RestartSheet({ open, onClose, programId, pathId, slug, name, done, onDone }: { open: boolean; onClose: () => void; programId: string; pathId: string | null; slug: string; name: string; done: number; onDone?: () => void }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Restart ${name}?`}
      description={done ? `You've finished ${done} day${done === 1 ? "" : "s"}. A fresh run starts from day one.` : "A fresh run starts from day one."}
      detents={["medium", "large"]}
      footer={
        <div className="trn-sheet-actions">
          <Button variant="fill" onClick={onClose}>
            Keep going
          </Button>
          <Button
            icon="repeat"
            aria-busy={pending || undefined}
            onClick={() =>
              start(async () => {
                const r = await restartPathAction(programId, pathId, slug);
                if (r.ok) {
                  toast(`Run ${r.runNumber} started`, { tone: "success" });
                  onClose();
                  onDone?.();
                } else toast(r.message);
              })
            }
          >
            Restart
          </Button>
        </div>
      }
    >
      <div className="trn-resets">
        <div>
          <h3 className="lq-t15 trn-resets-h">
            <Icon name="repeat" size="xs" /> Resets
          </h3>
          <ul>
            {RESETS.map((r) => (
              <li key={r} className="lq-t15">
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="lq-t15 trn-resets-h" data-kept="">
            <Icon name="bookmark" size="xs" /> Remembered
          </h3>
          <ul>
            {KEPT.map((r) => (
              <li key={r} className="lq-t15">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Sheet>
  );
}
