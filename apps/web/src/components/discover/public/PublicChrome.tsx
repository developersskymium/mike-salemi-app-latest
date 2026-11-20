import Link from "next/link";
import { Button } from "@/components/ui";
import { NavMenu, NavScroll } from "./NavClient";
import { PubWordmark } from "./Pieces";
import "./public.css";

const LINKS = [
  { href: "/explore", label: "Programs" },
  { href: "/explore/men-of-movement-retreats", label: "Retreats" },
  { href: "/explore/coaching", label: "Coaching" },
  { href: "/pricing", label: "Pricing" },
];

/**
 * Public top bar. Over a hero photo (`onPhoto`) it starts clear with white type and turns into the
 * blurred chalk bar once the page scrolls; elsewhere it is the chalk bar from the start.
 */
export function PublicNav({ signedIn, onPhoto }: { signedIn: boolean; onPhoto?: boolean }) {
  return (
    <NavScroll onPhoto={Boolean(onPhoto)}>
      <div className="pub-nav-in">
        <PubWordmark />
        <nav className="pub-nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} prefetch>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="pub-nav-cta">
          {signedIn ? (
            <Button href="/today" size="sm" variant="filled">Open the app</Button>
          ) : (
            <>
              <Link href="/signin" className="pub-nav-signin">Sign in</Link>
              <Button href="/signup" size="sm" variant="filled">Start free</Button>
            </>
          )}
          <NavMenu links={LINKS} signedIn={signedIn} />
        </div>
      </div>
    </NavScroll>
  );
}

export function PublicFooter() {
  return (
    <footer className="pub-footer">
      <div className="pub-footer-in">
        <div className="pub-footer-brand">
          <PubWordmark />
          <p className="lq-t13 lq-c2">Kettlebell programs, retreats and coaching with Mike Salemi. Mount Shasta, California.</p>
        </div>
        <nav className="pub-footer-cols" aria-label="Footer">
          <div>
            <p className="lq-eyebrow">Train</p>
            <Link href="/explore/kettlebell-lifestyle">Kettlebell Lifestyle</Link>
            <Link href="/explore/mastering-the-kettlebell">Mastering the Kettlebell</Link>
            <Link href="/explore">All programs</Link>
          </div>
          <div>
            <p className="lq-eyebrow">With Mike</p>
            <Link href="/explore/men-of-movement-retreats">Retreats</Link>
            <Link href="/explore/coaching">1:1 coaching</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
          <div>
            <p className="lq-eyebrow">Account</p>
            <Link href="/signup">Start free</Link>
            <Link href="/signin">Sign in</Link>
            <Link href="/auth/reset">Reset password</Link>
          </div>
        </nav>
      </div>
      <div className="pub-footer-base">
        <p className="lq-t12 lq-c3">© {new Date().getFullYear()} Mike Salemi</p>
      </div>
    </footer>
  );
}
