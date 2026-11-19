/** Training dates (YYYY-MM-DD) on the chosen weekdays (0=Sun) for `weeks` weeks, starting tomorrow. */
export function planScheduleDays(start: Date, weekdays: number[], weeks: number): string[] {
  const out: string[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + weeks * 7);
  while (d < end) {
    if (weekdays.includes(d.getDay())) {
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}
