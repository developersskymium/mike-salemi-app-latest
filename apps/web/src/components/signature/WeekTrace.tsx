import { MovementTrace, MOVEMENT_LABEL, type Movement } from "./MovementTrace";

export type WeekDay = {
  /** "M", "T" … */
  weekday: string;
  /** Day of the month. */
  date: number | string;
  /** The day's main movement; null for a rest day with nothing planned. */
  move: Movement | null;
  /** Caption under the date (defaults to the movement name). */
  caption?: string;
  state: "done" | "today" | "ahead" | "missed";
  /** Today's progress, 0–1. */
  progress?: number;
};

/** This week: each day drawn as the shape of its main movement, lit when done. */
export function WeekTrace({ days, animate = true, label = "This week" }: { days: WeekDay[]; animate?: boolean; label?: string }) {
  return (
    <ol className="tr-week" aria-label={label}>
      {days.map((d, i) => {
        const p = d.state === "done" ? 1 : d.state === "today" ? Math.max(0.0001, d.progress ?? 0.4) : 0;
        const caption = d.caption ?? (d.move ? MOVEMENT_LABEL[d.move] : "Rest");
        return (
          <li key={i} data-state={d.state} aria-current={d.state === "today" ? "date" : undefined}>
            <span className="tr-week-wd">{d.weekday}</span>
            {d.move ? (
              <MovementTrace move={d.move} size={36} weight={3.4} progress={p} animate={animate} delay={700 + i * 120} label="" />
            ) : (
              <span className="tr-week-rest" aria-hidden />
            )}
            <span className="tr-week-dn">{d.date}</span>
            <span className="tr-week-mv">{caption}</span>
            <span className="lq-sr">{d.state === "done" ? "done" : d.state === "today" ? "today" : d.state === "missed" ? "missed" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}
