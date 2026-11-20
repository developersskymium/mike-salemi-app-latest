import type { ReactNode } from "react";
import { AmbientBackdrop, IconButton, LargeTitle } from "@/components/ui";
import { PHOTOS } from "@/components/today/photos";
import "@/components/today/tpy.css";
import "./you.css";

/** Frame for You sub-pages (legacy PageHead): ambient backdrop, large title with a back button, optional lede. */
export function SubPage({ title, back, eyebrow, lede, children }: { title: string; back: string; eyebrow?: string; lede?: ReactNode; children: ReactNode }) {
  return (
    <>
      <AmbientBackdrop src={PHOTOS.coaching.src} position={PHOTOS.coaching.position} fixed />
      <div className="tpy-title">
        <LargeTitle title={title} eyebrow={eyebrow} leading={<IconButton icon="back" label="Back" href={back} size="sm" />} />
        {lede && <p className="lq-t17 lq-c2 yu-lede">{lede}</p>}
      </div>
      {children}
    </>
  );
}
