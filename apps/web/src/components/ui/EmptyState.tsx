import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

type Props = {
  title: string;
  body?: ReactNode;
  /** Slot for a custom graphic from components/graphics. Falls back to an icon. */
  illustration?: ReactNode;
  icon?: IconName;
  /** The one action that fixes the emptiness. */
  action?: ReactNode;
  className?: string;
};

/** Empty screens invite one action; errors say what happened and how to fix it. */
export function EmptyState({ title, body, illustration, icon = "sparkle", action, className }: Props) {
  return (
    <div className={cx("lq-empty", className)}>
      <div className="lq-illo" aria-hidden>
        {illustration ?? <Icon name={icon} size="lg" style={{ width: 48, height: 48, strokeWidth: 1.2 }} />}
      </div>
      <h2 className="lq-t22">{title}</h2>
      {body && <p className="lq-t15 lq-c2">{body}</p>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
