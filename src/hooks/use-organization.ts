import { useCallback, useEffect, useState } from "react";

/**
 * Organizations — UI-only for now.
 *
 * A real implementation would resolve the signed-in user's organization from
 * the backend and revoke sub-profile access when the org subscription lapses.
 * Until then we keep the shape here and persist a local demo org so the
 * wordmark, settings screen and seat list can be designed and reviewed.
 */

export type OrgSeatRole = "owner" | "admin" | "member";
export type OrgSeatStatus = "active" | "invited" | "suspended";

export type OrgSeat = {
  id: string;
  name: string;
  email: string;
  role: OrgSeatRole;
  status: OrgSeatStatus;
  /** Coach-view figures. UI-only until the backend owns organizations. */
  level?: string;
  daysDone?: number;
  daysTotal?: number;
  streak?: number;
  lastActive?: string;
};

export type Organization = {
  id: string;
  name: string;
  plan: string;
  seats: number;
  status: "active" | "past_due" | "cancelled";
  members: OrgSeat[];
};

const STORAGE_KEY = "kbl.organization";

export const demoOrganization: Organization = {
  id: "org_demo",
  name: "Iron Union Athletics",
  plan: "Team · 25 seats",
  seats: 25,
  status: "active",
  members: [
    { id: "1", name: "Dana Whitfield", email: "dana@ironunion.co", role: "owner", status: "active", level: "Level II", daysDone: 41, daysTotal: 90, streak: 9, lastActive: "Today" },
    { id: "2", name: "Marcus Reed", email: "marcus@ironunion.co", role: "admin", status: "active", level: "Level II", daysDone: 33, daysTotal: 90, streak: 4, lastActive: "Yesterday" },
    { id: "3", name: "Priya Nair", email: "priya@ironunion.co", role: "member", status: "active", level: "Level I", daysDone: 62, daysTotal: 90, streak: 14, lastActive: "Today" },
    { id: "4", name: "Tom Okafor", email: "tom@ironunion.co", role: "member", status: "invited", level: "Level I", daysDone: 0, daysTotal: 90, streak: 0, lastActive: "Not started" },
    { id: "5", name: "Elena Ruiz", email: "elena@ironunion.co", role: "member", status: "suspended", level: "Level I", daysDone: 11, daysTotal: 90, streak: 0, lastActive: "3 weeks ago" },
  ],
};

function read(): Organization | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Organization) : null;
  } catch {
    return null;
  }
}

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);

  // Read after mount so SSR and hydration agree.
  useEffect(() => setOrganization(read()), []);

  const save = useCallback((next: Organization | null) => {
    setOrganization(next);
    if (typeof window === "undefined") return;
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("kbl-organization"));
  }, []);

  useEffect(() => {
    const sync = () => setOrganization(read());
    window.addEventListener("kbl-organization", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kbl-organization", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { organization, setOrganization: save };
}
