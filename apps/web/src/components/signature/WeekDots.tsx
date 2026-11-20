import { Icon } from "../ui/Icon";

export type WeekDot = {
  /** "M", "T" … */
  label: string;
  state: "done" | "today" | "ahead" | "missed" | "rest";
  /** Day of the month (shown inside today's dot). */
  date?: number | string;
};

/** This week as seven dots: done days ember with a check, today an ember ring with the date. */
export function WeekDots({ days, size = "md", label = "This week" }: { days: WeekDot[]; size?: "sm" | "md"; label?: string }) {
  return (
    <ol className="sm-week" data-size={size === "sm" ? "sm" : undefined} aria-label={label}>
      {days.map((d, i) => (
        <li key={i} data-state={d.state} aria-current={d.state === "today" ? "date" : undefined}>
          <i>{d.state === "done" ? <Icon name="check" size="xs" /> : d.state === "today" ? d.date ?? "" : null}</i>
          <span>{d.label}</span>
          <span className="lq-sr">{d.state === "done" ? "trained" : d.state === "today" ? "today" : d.state === "missed" ? "missed" : ""}</span>
        </li>
      ))}
    </ol>
  );
}
