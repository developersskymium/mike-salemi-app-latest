import "@/components/discover/public/public.css";

/** Sign in, sign up and reset: full-height two-panel pages (legacy L31), no site chrome. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main">{children}</main>;
}
