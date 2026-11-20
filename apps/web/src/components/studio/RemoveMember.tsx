"use client";

import { Button } from "@/components/ui";
import { removeOrgMember } from "@/lib/studio/actions";
import { useRun } from "./forms";

export function RemoveMember({ orgId, userId, name }: { orgId: string; userId: string; name: string }) {
  const { run, pending } = useRun();
  return <Button variant="fill" size="sm" disabled={pending} onClick={() => confirm(`Remove ${name} from this organization?`) && run(() => removeOrgMember(orgId, userId), "Member removed")}>Remove</Button>;
}
