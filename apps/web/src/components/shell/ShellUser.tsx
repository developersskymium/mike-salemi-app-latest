"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import { Avatar } from "../ui/Avatar";

export type ShellUser = { name: string; avatarUrl?: string | null; subtitle?: string | null };

const Ctx = createContext<ShellUser | null>(null);

export function ShellUserProvider({ user, children }: { user: ShellUser; children: ReactNode }) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

/** The signed-in member (name, avatar) for headers. */
export const useShellUser = () => useContext(Ctx);

/** Avatar button for a page header, linking to You. */
export function UserButton({ variant = "glass" }: { variant?: "glass" | "clear" }) {
  const u = useShellUser();
  if (!u) return null;
  return (
    <Link href="/you" title="You" className="lq-press" style={{ display: "inline-flex", borderRadius: "50%" }}>
      <Avatar name={u.name} src={u.avatarUrl} variant={variant} />
    </Link>
  );
}
