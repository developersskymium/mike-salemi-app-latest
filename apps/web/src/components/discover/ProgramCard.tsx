import Link from "next/link";
import type { CatalogProgram } from "@ms/api";
import { Card, Chip, Glass, Icon } from "@/components/ui";
import { MovementFigure, type MoveName } from "@/components/graphics";
import { accessChip, canOpen, metaLine, outcomeLine, programPhoto } from "./access";
import "./discover.css";

/** Graphic covers for programs that have no photography yet (coaching, challenges, concepts). */
const GLYPH: Record<string, MoveName> = { coaching: "press", challenge: "swing", live: "breathing", retreat: "walking", course: "getup", day_program: "swing", tool: "squat" };

type Props = { program: CatalogProgram; href: string; action?: string; priority?: boolean; height?: number; chip?: { label: string; icon?: "lock" | "check" | "sparkle" } };

/** Image-led program card: photo, clear-glass footer with outcome, access chip and one action. */
export function ProgramCard({ program: p, href, action, priority, height = 340, chip: chipOverride }: Props) {
  const photo = programPhoto(p);
  const chip = chipOverride ?? accessChip(p);
  const outcome = outcomeLine(p);
  const meta = metaLine(p);
  const label = action ?? (canOpen(p) ? "Open" : chip.label === "Draft" ? "Preview" : "Details");

  const body = (
    <div className="dsc-pc-foot">
      <div className="dsc-pc-text">
        <div className="lq-t17 dsc-clamp1">{p.name}</div>
        {outcome && <div className="lq-t13 dsc-clamp2 dsc-dim">{outcome}</div>}
      </div>
      <div className="dsc-pc-row">
        <Chip variant="clear" icon={chip.icon}>{chip.label}</Chip>
        {meta && <span className="lq-t12 dsc-clamp1 dsc-dim dsc-pc-meta">{meta}</span>}
        <span className="lq-btn" data-variant="white" data-size="sm" aria-hidden>
          <span>{label}</span>
        </span>
      </div>
    </div>
  );

  return (
    <Link href={href} className="dsc-cardlink" aria-label={`${p.name}, ${chip.label}. ${label}`}>
      {photo ? (
        <Card height={height} image={{ src: photo.src, alt: photo.alt, position: photo.position, priority, sizes: "(min-width: 1024px) 360px, 92vw" }} footer={body} />
      ) : (
        <Glass radius="card" interactive className="dsc-pc-glyph lq-lift" style={{ height }}>
          <div className="dsc-pc-art" aria-hidden>
            <MovementFigure move={GLYPH[p.type] ?? "breathing"} size={150} />
          </div>
          <div className="dsc-pc-glyph-foot">
            <div className="lq-t17 dsc-clamp1">{p.name}</div>
            {outcome && <div className="lq-t13 lq-c2 dsc-clamp2">{outcome}</div>}
            <div className="dsc-pc-row">
              <Chip variant="fill" icon={chip.icon}>{chip.label}</Chip>
              {meta && <span className="lq-t12 lq-c2 dsc-clamp1 dsc-pc-meta">{meta}</span>}
              <span className="lq-btn" data-variant="fill" data-size="sm" aria-hidden>
                <span>{label}</span>
              </span>
            </div>
          </div>
        </Glass>
      )}
    </Link>
  );
}

/** Compact row for a free tool, with a moving figure as its cover. */
export function ToolRow({ id, name, tagline, href }: { id: string; name: string; tagline: string | null; href: string }) {
  return (
    <Link href={href} className="dsc-cardlink">
      <Glass radius="card" interactive className="dsc-toolrow lq-lift">
        <span className="dsc-toolrow-art" aria-hidden>
          <ToolGlyph id={id} size={64} />
        </span>
        <span className="dsc-toolrow-text">
          <span className="lq-t17">{name}</span>
          {tagline && <span className="lq-t13 lq-c2">{tagline}</span>}
        </span>
        <Icon name="chevron" size="sm" className="lq-c3" />
      </Glass>
    </Link>
  );
}

const TOOL_MOVE: Record<string, MoveName> = { "kettlebell-selector": "swing", "stretch-test": "lunge", "readiness-check": "breathing", "kettlebell-roadmap": "getup" };

export function ToolGlyph({ id, size = 96, animated = true }: { id: string; size?: number; animated?: boolean }) {
  return <MovementFigure move={TOOL_MOVE[id] ?? "swing"} size={size} animated={animated} />;
}
