"use client";

import { useEffect, useState } from "react";
import type { SettingsHub, Units } from "@/lib/settings/model";
import { AccountGroup } from "./AccountGroup";
import { BillingGroup } from "./BillingGroup";
import { HelpGroup } from "./HelpGroup";
import { NotificationsGroup } from "./NotificationsGroup";
import { PrivacyGroup } from "./PrivacyGroup";
import { ProfileGroup } from "./ProfileGroup";
import "@/components/ui/form/form.css";
import "./settings.css";

const NAV = [
  { id: "account", label: "Account" },
  { id: "profile", label: "Training profile" },
  { id: "notifications", label: "Notifications" },
  { id: "billing", label: "Billing" },
  { id: "privacy", label: "Privacy" },
  { id: "help", label: "Help" },
];

/** Settings: five groups (Account · Training profile · Notifications · Billing · Privacy) + Help. Every change saves on its own. */
export function SettingsHubView({ d }: { d: SettingsHub }) {
  const [units, setUnits] = useState<Units>(d.settings.units);
  const [active, setActive] = useState("account");

  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => {
      const top = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) setActive(top.target.id);
    }, { rootMargin: "-80px 0px -60% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <div className="st">
      <nav className="st-nav" aria-label="Settings sections">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} aria-current={active === n.id ? "true" : undefined}>{n.label}</a>
        ))}
      </nav>
      <div className="st-groups">
        <AccountGroup d={d} units={units} setUnits={setUnits} />
        <ProfileGroup profile={d.profile} sources={d.profileSources} units={units} ownedBells={d.settings.ownedBells} />
        <NotificationsGroup d={d} />
        <BillingGroup b={d.billing} />
        <PrivacyGroup requests={d.requests} />
        <HelpGroup d={d} />
      </div>
    </div>
  );
}
