import { PublicFooter, PublicNav } from "@/components/discover/public/PublicChrome";
import { publicViewer } from "@/lib/loaders/public";

/** Public site frame: chalk top bar, page, footer. Sales pages put their hero under the bar. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { signedIn } = await publicViewer();
  return (
    <div className="pub">
      <PublicNav signedIn={signedIn} />
      <main id="main" className="pub-main">{children}</main>
      <PublicFooter />
    </div>
  );
}
