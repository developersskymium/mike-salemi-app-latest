import Image from "next/image";
import { Button, Icon } from "@/components/ui";
import "./shop.css";

/** "First 3 sessions with your new bell": a free post-purchase series, unlocked by any kettlebell order. */
export const FIRST_SESSIONS = [
  {
    n: 1,
    title: "Meet your bell",
    minutes: 20,
    photo: { src: "/media/summit/mike-deadlift.jpg", alt: "Mike Salemi in a kettlebell deadlift", focal: "50% 30%" },
    why: "Learn to pick it up well. Every lift you'll ever do starts with this hinge.",
    blocks: [
      { name: "Warm-up", detail: "Hip hinge with the stick or a broom · 2 × 10, slow" },
      { name: "Kettlebell deadlift", detail: "5 × 5 · stand tall, squeeze, set it down with the same care" },
      { name: "Suitcase carry", detail: "3 × 30 steps each side · ribs down, shoulders level" },
      { name: "Cool-down", detail: "Box breathing · 4 rounds of 4-4-4-4" },
    ],
  },
  {
    n: 2,
    title: "The first swing",
    minutes: 25,
    photo: { src: "/media/summit/mike-standing.jpg", alt: "Mike Salemi standing tall", focal: "50% 20%" },
    why: "Turn the deadlift into power. Short sets, full rest, crisp reps.",
    blocks: [
      { name: "Warm-up", detail: "Deadlift · 2 × 5 · hip bridge · 2 × 10" },
      { name: "Hike pass", detail: "5 × 3 · hike the bell back, stand, park it" },
      { name: "Two-hand swing", detail: "8 × 5 · rest as long as you need between sets" },
      { name: "Cool-down", detail: "Couch stretch · 60 s each side" },
    ],
  },
  {
    n: 3,
    title: "Squat and press",
    minutes: 25,
    photo: { src: "/media/summit/mike-goblet.jpg", alt: "Mike Salemi in a goblet squat", focal: "50% 25%" },
    why: "Hold the bell close and own the bottom of the squat, then press it overhead.",
    blocks: [
      { name: "Warm-up", detail: "Prying goblet squat · 3 × 20 s" },
      { name: "Goblet squat", detail: "5 × 5 · elbows inside knees, stand up tall" },
      { name: "Half-kneeling press", detail: "3 × 5 each side · lighter bell if you have one" },
      { name: "Finish", detail: "Two-hand swing · 3 × 10" },
    ],
  },
];

export function FirstSessions({ unlocked }: { unlocked: boolean }) {
  return (
    <div className="shp-page shp-fs">
      <header className="shp-fs-head">
        <p className="lq-eyebrow" data-tone="warm">Free series · with your new bell</p>
        <h1 className="lq-d-xl">Your first 3 sessions</h1>
        <p className="lq-lede lq-c2">Three short sessions from Mike for the week your bell arrives. One bell, about 20 minutes each, two days apart.</p>
        {!unlocked && (
          <div className="shp-note" role="note">
            <span className="shp-note-ic" aria-hidden><Icon name="lock" size="sm" /></span>
            <span className="lq-t13">Free with any kettlebell from the shop. Here is what&apos;s inside.</span>
          </div>
        )}
      </header>
      <ol className="shp-fs-list">
        {FIRST_SESSIONS.map((s) => (
          <li key={s.n} className="shp-fs-item" data-locked={unlocked ? undefined : ""}>
            <figure className="shp-fs-photo">
              <Image src={s.photo.src} alt={s.photo.alt} fill sizes="(min-width: 1024px) 360px, 100vw" style={{ objectFit: "cover", objectPosition: s.photo.focal }} />
              <span className="shp-pill lq-num">Session {s.n} · {s.minutes} min</span>
            </figure>
            <div className="shp-fs-body">
              <h2 className="lq-d-sm">{s.title}</h2>
              <p className="lq-t15 lq-c2">{s.why}</p>
              {unlocked ? (
                <ul className="shp-fs-blocks">
                  {s.blocks.map((b) => (
                    <li key={b.name}>
                      <b className="lq-t15">{b.name}</b>
                      <span className="lq-t13 lq-c2">{b.detail}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lq-t13 lq-c2"><Icon name="lock" size="xs" /> {s.blocks.length} blocks</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="shp-fs-foot">
        {unlocked ? (
          <Button href="/programs/kettlebell-lifestyle" iconAfter="arrowRight">Next: Kettlebell Lifestyle, Level I</Button>
        ) : (
          <Button href="/shop/competition-kettlebell" iconAfter="arrowRight">Choose your bell</Button>
        )}
      </div>
    </div>
  );
}
