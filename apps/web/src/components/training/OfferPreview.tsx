"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import { CourseVideo } from "@/components/course/CourseVideo";
import { Icon } from "@/components/ui";
import { offerPreviewAction } from "@/lib/actions/offer-preview";
import type { OfferPreview } from "@/lib/offer-preview";
import "../course/course.css";
import "./offer-preview.css";

type Props = {
  /** The workout row's exercise ("Goblet Squat"), used to pick the lesson. */
  exercise: string;
  /** Short move name for the card headline ("goblet squat"). */
  move: string;
  /** Called as the popup opens (the day player pauses its own video). */
  onOpen?: () => void;
};

/**
 * The day player's smart-offer card ("Struggling with the goblet squat?") and its preview popup.
 * The popup sits over the day player (native modal dialog: focus trap, Esc, backdrop click), so the
 * workout keeps its step, timer and video position. With access it plays the Mastering the Kettlebell
 * lesson; without, a glimpse: locked lesson, what you'd learn, price and the way to unlock.
 */
export function OfferPreviewCard({ exercise, move, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<OfferPreview | null | undefined>(undefined);
  const loading = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const load = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    void offerPreviewAction(exercise)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => {
        loading.current = false;
      });
  }, [exercise]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="kd-help op-card lq-press"
        aria-haspopup="dialog"
        onPointerEnter={() => data === undefined && load()}
        onClick={() => {
          onOpen?.();
          setOpen(true);
          load();
        }}
      >
        <span className="kd-help-ph">
          <Image src="/media/summit/mike-deadlift.jpg" alt="" fill sizes="64px" style={{ objectPosition: "50% 30%" }} />
        </span>
        <span className="kd-help-t">
          <b>Struggling with the {move}?</b>
          <span>Mike breaks it down frame by frame in Mastering the Kettlebell.</span>
          <span className="kd-help-cta">
            Watch a preview <Icon name="fullscreen" size="xs" />
          </span>
        </span>
      </button>
      {open && <OfferPreviewDialog data={data} trigger={trigger} onClose={() => setOpen(false)} />}
    </>
  );
}

function OfferPreviewDialog({ data, trigger, onClose }: { data: OfferPreview | null | undefined; trigger: RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    const back = trigger.current ?? (document.activeElement as HTMLElement | null);
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    if (d && !d.open) d.showModal();
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevOverflow;
      if (d?.open) d.close();
      back?.focus?.({ preventScroll: true });
    };
  }, [trigger]);

  return (
    <dialog
      ref={ref}
      className="op-dlg"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="op-panel">
        <button type="button" className="op-x lq-press" aria-label="Close preview" onClick={onClose}>
          <Icon name="close" size="sm" />
        </button>
        {data === undefined ? (
          <Loading titleId={titleId} />
        ) : data === null ? (
          <Failed titleId={titleId} onClose={onClose} />
        ) : data.mode === "watch" ? (
          <Watch d={data} titleId={titleId} />
        ) : (
          <Glimpse d={data} titleId={titleId} onClose={onClose} />
        )}
      </div>
    </dialog>
  );
}

function Loading({ titleId }: { titleId: string }) {
  return (
    <>
      <div className="op-media op-media-wait" aria-hidden />
      <div className="op-body" aria-busy="true">
        <h2 id={titleId} className="op-sr">Loading preview</h2>
        <i className="op-skel" style={{ width: "40%" }} />
        <i className="op-skel op-skel-lg" style={{ width: "70%" }} />
        <i className="op-skel" style={{ width: "90%" }} />
      </div>
    </>
  );
}

function Failed({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  return (
    <div className="op-body op-failed">
      <h2 id={titleId} className="op-title">We couldn&apos;t load this preview</h2>
      <p className="op-desc">Check your connection and try again in a moment.</p>
      <div className="op-actions">
        <a href="/explore/mastering-the-kettlebell" target="_blank" rel="noopener" className="lq-btn lq-press" data-variant="secondary" data-size="md">
          <span>See Mastering the Kettlebell</span>
        </a>
        <button type="button" className="lq-btn lq-press" data-variant="plain" data-size="md" onClick={onClose}>
          <span>Close</span>
        </button>
      </div>
    </div>
  );
}

function Head({ d, titleId }: { d: OfferPreview; titleId: string }) {
  return (
    <div className="op-head">
      <p className="op-eyebrow">
        {d.program.name} · {d.lesson.section}
      </p>
      <h2 id={titleId} className="op-title">
        {d.lesson.title}
      </h2>
    </div>
  );
}

function Watch({ d, titleId }: { d: OfferPreview; titleId: string }) {
  return (
    <>
      <div className="op-media">
        <CourseVideo
          video={d.video}
          poster={d.lesson.poster}
          title={`${d.lesson.section}: ${d.lesson.title}`}
          fallbackImage={d.program.cover}
          kicker={d.lesson.section}
          autoStart={Boolean(d.video)}
        />
      </div>
      <div className="op-body op-body-split">
        <div>
          <Head d={d} titleId={titleId} />
          <p className="op-desc">{d.lesson.description}</p>
          <Learn bullets={d.lesson.bullets} heading="In this lesson" />
        </div>
        <div className="op-actions">
          <a href={d.lesson.href} target="_blank" rel="noopener" className="lq-btn lq-press" data-variant="secondary" data-size="md">
            <span>Open in {d.program.name}</span>
            <Icon name="external" size="sm" />
          </a>
        </div>
      </div>
    </>
  );
}

function Glimpse({ d, titleId, onClose }: { d: OfferPreview; titleId: string; onClose: () => void }) {
  const locked = (
    <div className="op-locked" aria-hidden={d.clip ? undefined : true}>
      <Image src={d.lesson.poster} alt="" fill sizes="(min-width: 1024px) 960px, 100vw" />
      <span className="op-lock">
        <Icon name="lock" size="md" />
      </span>
    </div>
  );
  return (
    <>
      <div className="op-media">
        {d.clip ? (
          <CourseVideo video={d.clip} poster={d.program.cover} title="Program walk-through" fallbackImage={d.program.cover} kicker="Free preview" />
        ) : (
          <>
            {locked}
            <span className="op-locked-cap">Part of {d.program.name}</span>
          </>
        )}
      </div>
      {d.clip && <p className="op-clip-cap">Free preview: a walk-through of {d.program.name}</p>}
      <div className="op-body op-body-split">
        <div>
          <div className="op-lesson">
            <span className="op-lesson-th" aria-hidden>
              <Image src={d.lesson.poster} alt="" fill sizes="96px" />
              <span className="op-lesson-lock">
                <Icon name="lock" size="sm" />
              </span>
            </span>
            <Head d={d} titleId={titleId} />
          </div>
          <Learn bullets={d.lesson.bullets} heading="What you'll learn" />
        </div>
        <div className="op-buy">
          {d.price && (
            <div className="op-price">
              <b>{d.price.label}</b>
              {d.price.note && <span>{d.price.note}</span>}
            </div>
          )}
          <div className="op-actions op-actions-col">
            <a href={d.unlockHref} target="_blank" rel="noopener" className="lq-btn lq-press" data-variant="filled" data-size="md" data-block="">
              <Icon name="unlock" size="sm" />
              <span>Unlock {d.program.name}</span>
            </a>
            <button type="button" className="lq-btn lq-press" data-variant="plain" data-size="md" data-block="" onClick={onClose}>
              <span>Not now</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Learn({ bullets, heading }: { bullets: string[]; heading: string }) {
  if (!bullets.length) return null;
  return (
    <>
      <p className="op-learn-h">{heading}</p>
      <ul className="op-learn">
        {bullets.map((b) => (
          <li key={b}>
            <Icon name="check" size="xs" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
