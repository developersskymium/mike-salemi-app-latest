import type { Metadata } from "next";
import { Button, Icon } from "@/components/ui";
import { JoinButton } from "@/components/orgs/JoinButton";
import { Photo, PubWordmark } from "@/components/discover/public/Pieces";
import { PHOTOS } from "@/components/discover/public/photos";
import { loadJoin } from "@/lib/loaders/commerce";
import "@/components/commerce/commerce.css";
import "@/components/discover/public/public.css";

export const metadata: Metadata = { title: "Join your team", robots: { index: false, follow: false } };

/** Public landing for org invite and join links. */
export default async function JoinPage(props: PageProps<"/join/[token]">) {
  const { token } = await props.params;
  const info = await loadJoin(token);
  const next = `/join/${token}`;
  return (
    <main className="pub pub-solo">
      <article className="pub-solo-card">
        <Photo p={PHOTOS.groupLand} sizes="520px" priority>
          <PubWordmark />
        </Photo>
        <div className="pub-solo-body">
          <span className="pub-solo-badge" data-tone="accent"><Icon name="people" /></span>
          <p className="lq-eyebrow" data-tone="accent">{info.kind === "invite" ? "You’ve been invited" : "Team access"}</p>
          <h1 className="lq-d-md">{info.orgName ? `Join ${info.orgName}` : "Join your team on Mike Salemi"}</h1>
          <p className="lq-t15 lq-c2">Your organization covers your membership: Mike&rsquo;s programs, the library and tools. Your progress stays yours.</p>
          <div className="pub-solo-actions">
            {info.alreadyMember ? (
              <Button href="/today" block size="lg">You&rsquo;re already in. Go to Today</Button>
            ) : info.signedIn ? (
              <JoinButton token={token} kind={info.kind} />
            ) : (
              <>
                <Button href={`/signup?next=${encodeURIComponent(next)}`} block size="lg">Create your account</Button>
                <Button href={`/signin?next=${encodeURIComponent(next)}`} block size="md" variant="ghost">I already have an account</Button>
              </>
            )}
          </div>
          {info.kind === "invite" && !info.alreadyMember && <p className="lq-t12 lq-c3">Use the email address the invite was sent to.</p>}
        </div>
      </article>
    </main>
  );
}
