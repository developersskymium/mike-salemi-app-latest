import type { ProgramAccess } from "@ms/api";
import { ProgramCta } from "@/components/access/ProgramCta";
import type { ButtonVariant } from "@/components/ui";
import { programAccess } from "@/lib/access";

/**
 * State-aware Join / Start (spec 11). Server Component: resolves the member's access to the program
 * (one cached RPC per request) and renders the right action — Start / Continue · Included in your plan —
 * Start · Upgrade to <Plan> · Buy — $X · Free — Start · Apply. Props are backward compatible with the
 * old client JoinButton; pass `access` when you already have it, `slug` is optional.
 */
export async function JoinButton({
  programId,
  pathId,
  name,
  slug,
  access,
  variant = "fill",
  size = "sm",
  block,
  label,
  showNote = false,
}: {
  programId: string;
  pathId: string | null;
  name: string;
  slug?: string;
  access?: ProgramAccess | null;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  label?: string;
  showNote?: boolean;
}) {
  const a = access !== undefined ? access : await programAccess(programId);
  return (
    <ProgramCta
      access={a}
      program={{ id: programId, slug: a?.slug ?? slug ?? programId, name }}
      pathId={pathId}
      variant={variant}
      size={size}
      block={block}
      showNote={showNote}
      startLabel={label && label !== "Join program" ? label : undefined}
    />
  );
}
