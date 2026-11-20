const LABEL: Record<string, string> = {
  intention: "Coming for", calling: "Why now", experience: "Experience", health: "Health", diet: "Dietary needs",
  sweatLodgeOk: "Sweat lodge", fullAttendance: "Full attendance", agreements: "Circle agreements",
  phone: "Phone", emergencyName: "Emergency contact", emergencyPhone: "Emergency phone",
};

/** A retreat application's answers as a definition list (legacy review table). */
export function Answers({ answers }: { answers: Record<string, unknown> | null | undefined }) {
  const entries = Object.entries(answers ?? {}).filter(([, v]) => v !== "" && v != null);
  if (!entries.length) return <p className="st-faint" style={{ margin: "8px 0" }}>No answers stored.</p>;
  return (
    <dl className="st-answers">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt>{LABEL[k] ?? k.replace(/_/g, " ")}</dt>
          <dd>{typeof v === "boolean" ? (v ? "Yes" : "No") : Array.isArray(v) ? v.join(", ") : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}
