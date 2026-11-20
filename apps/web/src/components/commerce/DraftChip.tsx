import { Chip } from "@/components/ui";

/** Quiet marker on facts Mike hasn't confirmed yet (rows with draft_note). */
export function DraftChip({ note, onPhoto }: { note: string | null | undefined; onPhoto?: boolean }) {
  if (!note) return null;
  return (
    <Chip variant={onPhoto ? "clear" : "outline"} className="com-draft" title={note} aria-label={`Draft: ${note}`}>
      Draft
    </Chip>
  );
}
