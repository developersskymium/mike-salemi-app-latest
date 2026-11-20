import { MOVES } from "/home/claude/mike-salemi-app-latest/apps/web/src/components/graphics/figures/library";
import { geoAt, GROUND } from "/home/claude/mike-salemi-app-latest/apps/web/src/components/graphics/figures/rig";
import { BELL_OUTLINE, BELL_WINDOW } from "/home/claude/mike-salemi-app-latest/apps/web/src/components/graphics/figures/bell";
const out: any = { GROUND, BELL: BELL_OUTLINE + BELL_WINDOW, moves: {} };
for (const [k, m] of Object.entries(MOVES)) {
  out.moves[k] = { view: (m as any).view ?? [0,0,240], still: (m as any).still, grip: (m as any).cfg.grip, frames: {} as any };
  for (let i = 0; i < 12; i++) { const t = i/12; out.moves[k].frames[t.toFixed(3)] = geoAt(m as any, t, 1); }
}
console.log(JSON.stringify(out));
