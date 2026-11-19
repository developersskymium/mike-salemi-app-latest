import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getEntitlements,
  grantEntitlement,
  revokeEntitlement,
} from "@/lib/entitlements.functions";
import { useSession } from "@/hooks/use-session";

export type EntitlementRow = {
  id: string;
  product_id: string;
  kind: string;
  status: string;
  metadata: Record<string, unknown> | null;
  granted_at: string;
};

export function useEntitlements() {
  const { user } = useSession();
  const fetchEntitlements = useServerFn(getEntitlements);
  const grantFn = useServerFn(grantEntitlement);
  const revokeFn = useServerFn(revokeEntitlement);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["entitlements"],
    queryFn: () => fetchEntitlements() as Promise<EntitlementRow[]>,
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const rows = query.data ?? [];

  const has = useCallback(
    (productId: string) => rows.some((row) => row.product_id === productId && row.status === "active"),
    [rows],
  );

  const get = useCallback(
    (productId: string) => rows.find((row) => row.product_id === productId) ?? null,
    [rows],
  );

  const grant = useMutation({
    mutationFn: (input: {
      productId: string;
      kind: "course" | "retreat" | "program" | "product";
      metadata?: Record<string, unknown>;
    }) => grantFn({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entitlements"] }),
  });

  const revoke = useMutation({
    mutationFn: (productId: string) => revokeFn({ data: { productId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entitlements"] }),
  });

  return { rows, has, get, grant, revoke, isLoading: query.isLoading };
}
