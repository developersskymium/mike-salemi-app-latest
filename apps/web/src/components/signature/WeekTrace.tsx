import { Icon } from "../ui/Icon";
import { MOVEMENT_LABEL, type Movement } from "./MovementTrace";

export type WeekDay = {
  /** "M", "T" … */
  weekday: string;
  /** Day of the month. */
  date: number | string;
  /** The day's main movement; null for a rest day with nothing planned. */
  move: Movement | null;
  /** Caption under the dot (defaults to the movement name). */
  caption?: string;
  state: "done" | "today" | "ahead" | "missed";
  /** Today's progress, 0–1 (shown as the ring's fill). */
  progress?: number;
};

/** This week as Summit day dots: done days ember with a check, today an ember ring with the date. */
export function WeekTrace({ days, label = "This week" }: { days: WeekDay[]; animate?: boolean; label?: string }) {
  return (
    <ol className="tr-week" aria-label={label}>
      {days.map((d, i) => {
        const caption = d.caption ?? (d.move ? MOVEMENT_LABEL[d.move] : "Rest");
        return (
          <li key={i} data-state={d.state} aria-current={d.state === "today" ? "date" : undefined}>
            <i className="tr-week-dot">{d.state === "done" ? <Icon name="check" size="xs" /> : d.state === "today" ? d.date : null}</i>
            <span className="tr-week-wd">{d.weekday}</span>
            <span className="tr-week-mv">{caption}</span>
            <span className="lq-sr">
              {d.date} {d.state === "done" ? "done" : d.state === "today" ? "today" : d.state === "missed" ? "missed" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
