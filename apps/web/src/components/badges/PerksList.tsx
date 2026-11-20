import Link from "next/link";
import type { MemberPerk } from "@ms/api";
import { Icon, type IconName } from "@/components/ui";
import "./badges.css";

const ICON: Record<string, IconName> = { bonus_video: "play", discount: "gift", free_month: "calendar", coaching_credit: "coaching" };
const fmt = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));

/** Rewards the member unlocked with badges. Discount perks show their one-time code (applied at checkout). */
export function PerksList({ perks }: { perks: MemberPerk[] }) {
  if (!perks.length) return null;
  return (
    <section className="bd-perks" aria-labelledby="bd-perks-t">
      <h3 id="bd-perks-t" className="lq-d-xs">
        Your rewards
      </h3>
      <ul role="list">
        {perks.map((p) => (
          <li key={p.id} className="bd-perk" data-used={p.redeemed_at ? "" : undefined}>
            <span className="bd-perk-ic" aria-hidden>
              <Icon name={ICON[p.kind] ?? "gift"} size="sm" />
            </span>
            <span className="bd-perk-b">
              <b className="lq-t15">{p.label}</b>
              <span className="lq-t13 lq-c2">
                {p.redeemed_at ? `Used ${fmt(p.redeemed_at)}` : [p.detail, p.expires_at ? `Use by ${fmt(p.expires_at)}` : null].filter(Boolean).join(" · ")}
              </span>
            </span>
            {p.coupon_code && !p.redeemed_at ? (
              <code className="bd-code" aria-label={`Code ${p.coupon_code}`}>
                {p.coupon_code}
              </code>
            ) : p.href ? (
              <Link href={p.href} className="lq-link lq-t13">
                Open
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
