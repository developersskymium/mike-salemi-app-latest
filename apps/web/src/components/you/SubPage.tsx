import type { ReactNode } from "react";
import { AmbientBackdrop, IconButton, LargeTitle } from "@/components/ui";
import { PHOTOS } from "@/components/today/photos";
import "@/components/today/tpy.css";

/** Frame for You sub-pages: ambient backdrop, large title with a back button. */
export function SubPage({ title, back, eyebrow, children }: { title: string; back: string; eyebrow?: string; children: ReactNode }) {
  return (
    <>
      <AmbientBackdrop src={PHOTOS.coaching.src} position={PHOTOS.coaching.position} fixed />
      <div className="tpy-title">
        <LargeTitle title={title} eyebrow={eyebrow} leading={<IconButton icon="back" label="Back" href={back} size="sm" />} />
      </div>
      {children}
    </>
  );
}
