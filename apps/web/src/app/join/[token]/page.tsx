import type { Metadata } from "next";
import { Glass, Icon } from "@/components/ui";
import { AmbientBackdrop } from "@/components/ui";
import { JoinButton } from "@/components/orgs/JoinButton";
import { loadJoin } from "@/lib/loaders/commerce";
import "@/components/commerce/commerce.css";
import "@/components/orgs/orgs.css";

export const metadata: Metadata = { title: "Join your team", robots: { index: false, follow: false } };

/** Public landing for org invite and join links. */
export default async function JoinPage(props: PageProps<"/join/[token]">) {
  const { token } = await props.params;
  const info = await loadJoin(token);
  const next = `/join/${token}`;
  return (
    <main className="com-result" style={{ minHeight: "100dvh" }}>
      <AmbientBackdrop src="/media/retreats/live/group-tims-land.jpg" fixed />
      <Glass radius="card" className="com-result-card" style={{ position: "relative" }}>
        <span className="org-join-mark" aria-hidden><Icon name="people" size="lg" style={{ width: 40, height: 40 }} /></span>
        <p className="lq-t13 lq-c2" style={{ fontWeight: 600 }}>{info.kind === "invite" ? "You’ve been invited" : "Team access"}</p>
        <h1 className="lq-t28">{info.orgName ? `Join ${info.orgName}` : "Join your team on Mike Salemi"}</h1>
        <p className="lq-t15 lq-c2">
          Your organization covers your membership: Mike&rsquo;s programs, the library and tools. Your progress stays yours.
        </p>
        {info.alreadyMember ? (
          <a className="lq-btn lq-fx lq-press" data-variant="filled" data-block="" data-fx="" href="/today"><span>You&rsquo;re already in. Go to Today</span></a>
        ) : info.signedIn ? (
          <JoinButton token={token} kind={info.kind} />
        ) : (
          <>
            <a className="lq-btn lq-fx lq-press" data-variant="filled" data-block="" data-fx="" href={`/signup?next=${encodeURIComponent(next)}`}><span>Create your account</span></a>
            <a className="lq-btn lq-fx lq-press" data-variant="plain" data-size="md" data-fx="" href={`/signin?next=${encodeURIComponent(next)}`}><span>I already have an account</span></a>
          </>
        )}
        {info.kind === "invite" && !info.alreadyMember && <p className="lq-t12 lq-c3">Use the email address the invite was sent to.</p>}
      </Glass>
    </main>
  );
}
