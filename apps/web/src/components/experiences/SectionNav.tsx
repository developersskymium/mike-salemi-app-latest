"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui";

/** Sticky chip row; the chip of the section in view is highlighted. */
export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [cur, setCur] = useState(sections[0]?.id);
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (es) => {
        const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (window.scrollY < 240) setCur(sections[0]?.id);
        else if (vis) setCur(vis.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sections]);
  return (
    <nav className="exp-nav" aria-label="On this page">
      {sections.map((s) => (
        <a key={s.id} href={`#${s.id}`} aria-current={cur === s.id ? "true" : undefined} onClick={() => setCur(s.id)}>
          <Chip variant="glass">{s.label}</Chip>
        </a>
      ))}
    </nav>
  );
}
