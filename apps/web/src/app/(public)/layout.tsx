import { PublicFooter, PublicNav } from "@/components/discover/public/PublicChrome";
import { getUser } from "@/lib/supabase/server";
import "@/components/discover/discover.css";

/** Public site frame: floating glass nav, page, footer. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  return (
    <div className="dsc-public">
      <PublicNav signedIn={Boolean(user)} />
      <main id="main" className="dsc-public-main">{children}</main>
      <PublicFooter />
    </div>
  );
}
