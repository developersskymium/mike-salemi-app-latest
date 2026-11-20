import Link from "next/link";
import { Icon } from "@/components/ui";
import { SWING_PROGRAM_SLUG } from "@/lib/swing";
import "./swing.css";

/** "Check my set-up" after the 7 steps on What Your Kettlebell Swing Is Missing (spec 13). */
export function SwingSetupCta({ slug }: { slug: string }) {
  if (slug !== SWING_PROGRAM_SLUG) return null;
  return (
    <Link href="/tools/swing-setup?view=check" className="sw-cta" prefetch>
      <span className="sw-cta-ic" aria-hidden><Icon name="video" size="sm" /></span>
      <span className="sw-cta-body">
        <b>Check my set-up</b>
        <small>Film it side-on. The Swing Set-Up Coach measures it against these 7 steps and gives you one fix, in Mike’s words.</small>
      </span>
      <Icon name="chevron" size="sm" className="sw-cta-go" />
    </Link>
  );
}
