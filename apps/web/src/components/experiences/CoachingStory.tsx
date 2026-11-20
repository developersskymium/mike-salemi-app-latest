import Image from "next/image";
import Link from "next/link";
import { Button, Icon } from "@/components/ui";
import { MIKE_FACE } from "@/lib/covers";

/**
 * The coaching concept page as a full experience (spec 10 "Coaching: a full coaching experience"):
 * the two sides of the work in photos of Mike, how one session runs from booking to the plan you
 * leave with, Executive Edge as the deeper path, and a booking band. Photos are full colour with
 * face-safe focal points; every action goes to /coaching, where packages and times live.
 */

const SIDES = [
  {
    src: "/media/summit/mike-press.jpg",
    focal: "60% 14%",
    alt: "Mike Salemi pressing a kettlebell overhead",
    kicker: "Physical performance",
    title: "Move better, lift stronger",
    points: ["Technique review on your own footage", "Strength, mobility and kettlebell programming", "A written plan you can train tomorrow"],
  },
  {
    src: "/media/summit/breathwork.jpg",
    focal: "50% 45%",
    alt: "Men breathing together on the grass with Mike",
    kicker: "Inner work",
    title: "Stay steady under pressure",
    points: ["Mental focus, energy and nervous-system practice", "Breathwork you can use the same day", "One highest-priority thing every day"],
  },
] as const;

const STEPS = [
  { n: "01", title: "Pick a Tuesday time", body: "45 minutes on video with Mike, shown in your own time zone.", src: "/media/summit/mike-standing.jpg", focal: "52% 22%", alt: "Mike Salemi in the gym" },
  { n: "02", title: "Send your sticking point", body: "Your goal and a short clip of the lift, so the call goes straight to the fix.", src: "/media/summit/mike-squat.jpg", focal: "40% 6%", alt: "Mike Salemi in a racked kettlebell squat" },
  { n: "03", title: "Leave with one next step", body: "Mike's notes and the one thing to work on land here after the call.", src: "/media/summit/working-in.jpg", focal: "28% 30%", alt: "Mike Salemi teaching a Working In session" },
] as const;

export function CoachingStory({ priceLabel }: { priceLabel: string | null }) {
  return (
    <>
      <section className="exp-section cst" aria-labelledby="cst-sides">
        <header className="exp-heading">
          <div>
            <div className="exp-kicker">What coaching is</div>
            <h2 id="cst-sides" className="lq-t22">Two sides of the same work</h2>
          </div>
        </header>
        <div className="cst-sides">
          {SIDES.map((s) => (
            <article key={s.kicker} className="cst-side">
              <div className="cst-side-photo">
                <Image src={s.src} alt={s.alt} fill sizes="(min-width: 1024px) 540px, 100vw" style={{ objectPosition: s.focal }} />
                <span className="cst-side-kicker">{s.kicker}</span>
              </div>
              <div className="cst-side-body">
                <h3 className="lq-d-sm">{s.title}</h3>
                <ul role="list">
                  {s.points.map((p) => (
                    <li key={p}>
                      <Icon name="check" size="xs" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="exp-section cst" aria-labelledby="cst-steps">
        <header className="exp-heading">
          <div>
            <div className="exp-kicker">One session</div>
            <h2 id="cst-steps" className="lq-t22">From booking to your next step</h2>
          </div>
        </header>
        <ol className="cst-steps" role="list">
          {STEPS.map((s) => (
            <li key={s.n} className="cst-step">
              <div className="cst-step-photo">
                <Image src={s.src} alt={s.alt} fill sizes="(min-width: 1024px) 360px, 100vw" style={{ objectPosition: s.focal }} />
                <span className="cst-step-n lq-num">{s.n}</span>
              </div>
              <div className="cst-step-body">
                <b>{s.title}</b>
                <span>{s.body}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="exp-section" aria-label="Executive Edge">
        <Link href="/coaching#executive" className="cst-edge lq-press">
          <Image src="/media/summit/mike-deadlift.jpg" alt="Mike Salemi setting up a heavy kettlebell deadlift" fill sizes="(min-width: 1024px) 1100px, 100vw" style={{ objectPosition: "45% 8%" }} />
          <span className="cst-edge-copy">
            <span className="cst-edge-tag">By application</span>
            <b className="lq-d-md">Executive Edge</b>
            <span>Eight weeks of daily five-minute practice and three to four direct sessions with Mike, for leaders who want focus, energy and a body that keeps up.</span>
            <span className="cst-edge-cta">
              See Executive Edge <Icon name="arrowRight" size="xs" />
            </span>
          </span>
        </Link>
      </section>

      <section className="cst-band" aria-label="Book a session">
        <span className="cst-band-face">
          <Image src={MIKE_FACE} alt="" fill sizes="56px" />
        </span>
        <span className="cst-band-tx">
          <b>Mike&apos;s coaching day is Tuesday</b>
          <span>45 minutes on video{priceLabel ? ` · ${priceLabel}` : ""} · shown in your time zone</span>
        </span>
        <Button href="/coaching" variant="filled" size="md" iconAfter="chevron">
          Choose a time
        </Button>
      </section>
    </>
  );
}
