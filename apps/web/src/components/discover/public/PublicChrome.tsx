import Link from "next/link";
import { Button, Glass } from "@/components/ui";
import { Kettlebell } from "@/components/graphics";
import "../discover.css";

/** Floating glass navigation for the public site. */
export function PublicNav({ signedIn, onPhoto }: { signedIn: boolean; onPhoto?: boolean }) {
  return (
    <div className="dsc-nav-wrap" data-on-photo={onPhoto ? "" : undefined}>
      <Glass as="nav" level={onPhoto ? "clear" : "regular"} radius="pill" className="dsc-nav" aria-label="Main">
        <Link href="/" className="dsc-brand" aria-label="Mike Salemi, home">
          <Kettlebell size={22} variant="line" title="" />
          <span className="lq-t17">Mike Salemi</span>
        </Link>
        <div className="dsc-nav-links">
          <Link href="/explore" className="lq-t15">Programs</Link>
          <Link href="/explore/men-of-movement-retreats" className="lq-t15">Retreats</Link>
          <Link href="/pricing" className="lq-t15">Pricing</Link>
        </div>
        <div className="dsc-nav-cta">
          {signedIn ? (
            <Button href="/today" size="sm" variant={onPhoto ? "white" : "fill"}>Open app</Button>
          ) : (
            <>
              <Link href="/signin" className="lq-t15 dsc-nav-signin">Sign in</Link>
              <Button href="/signup" size="sm" variant={onPhoto ? "white" : "fill"}>Join</Button>
            </>
          )}
        </div>
      </Glass>
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="dsc-footer">
      <div className="dsc-footer-in">
        <div className="dsc-brand">
          <Kettlebell size={20} variant="line" title="" />
          <span className="lq-t15">Mike Salemi</span>
        </div>
        <nav className="dsc-footer-links lq-t13" aria-label="Footer">
          <Link href="/explore">Programs</Link>
          <Link href="/explore/men-of-movement-retreats">Retreats</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/signin">Sign in</Link>
        </nav>
        <p className="lq-t12 lq-c3">© {new Date().getFullYear()} Mike Salemi</p>
      </div>
    </footer>
  );
}
