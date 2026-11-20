import Image from "next/image";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui";
import { PageHead, Panel } from "@/components/studio/ui";
import { studioAdmin } from "@/lib/studio/guard";

export const metadata = { title: "Design system" };

/** Static screenshot thumbnails (live iframes never painted: they block on remote fonts). */
const REFS: { href: string; title: string; line: string; icon: IconName; shot: string }[] = [
  { href: "/gallery", title: "Summit design system", line: "Colour, type, surfaces, buttons, chips, progress, the Climb and every primitive, with a light/dark switch.", icon: "grid", shot: "/media/studio/ref-system.jpg" },
  { href: "/gallery/shell", title: "App shell", line: "The rail, top bar, phone tab bar and the approved Home composition.", icon: "display", shot: "/media/studio/ref-shell.jpg" },
  { href: "/graphics-preview", title: "Graphics specimen", line: "Movement figures, day glyphs, phase landscapes, medals, empty scenes and skies.", icon: "sparkle", shot: "/media/studio/ref-graphics.jpg" },
];

const SWATCHES = [
  { name: "Glacier", role: "Do this: primary actions, links, selection", vars: ["--glacier-100", "--glacier-300", "--glacier-500", "--glacier-700", "--glacier-900"] },
  { name: "Ember", role: "Progress, streaks, achievement", vars: ["--ember-50", "--ember-200", "--ember-400", "--ember-500", "--ember-700"] },
  { name: "Ink & chalk", role: "Text, surfaces and the warm ground", vars: ["--ink-900", "--ink-600", "--ink-400", "--chalk-200", "--chalk-50"] },
];

const RULES = [
  "Mike leads: full-colour photos on every key screen, never tinted or washed out.",
  "One obvious next step per screen: one glacier action; ember for resume and progress.",
  "No covers with baked-in text; set a focal point so no crop cuts a face.",
  "Glass only on small overlays: tab bar, video controls, photo badges.",
  "Light + dark, phone (390) + desktop (1440) screenshots before anything ships.",
];

/** Studio › Design: the design references (admin-only since they left the public site). */
export default async function DesignPage() {
  await studioAdmin();
  return (
    <>
      <PageHead eyebrow={[{ label: "Design" }]} title="Design system" sub="The approved Summit references. These pages are visible to admins only." />
      <div className="st-grid st-g3" style={{ marginBottom: 16 }}>
        {REFS.map((r) => (
          <Link key={r.href} href={r.href} className="st-ref" target="_blank">
            <span className="st-ref-frame" aria-hidden>
              <Image src={r.shot} alt="" fill sizes="(min-width: 1024px) 400px, 100vw" style={{ objectFit: "cover", objectPosition: "50% 0%" }} />
            </span>
            <span className="st-ref-body">
              <span className="st-ref-ic"><Icon name={r.icon} size="sm" /></span>
              <span>
                <b>{r.title}</b>
                <small>{r.line}</small>
              </span>
              <Icon name="external" size="xs" />
            </span>
          </Link>
        ))}
      </div>
      <div className="st-grid st-g2">
        <Panel title="Colour roles" meta="packages/tokens">
          <div className="st-swatches">
            {SWATCHES.map((s) => (
              <div key={s.name} className="st-swatch-row">
                <div>
                  <b>{s.name}</b>
                  <small>{s.role}</small>
                </div>
                <span className="st-swatch-chips">
                  {s.vars.map((v) => (
                    <i key={v} style={{ background: `var(${v})` }} title={v} />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Rules for every page" meta="docs/design/system.md">
          <ul className="st-rules">
            {RULES.map((r) => (
              <li key={r}><Icon name="check" size="xs" /> {r}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
