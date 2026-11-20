/** Re-mounts per navigation: CSS page-enter fallback where View Transitions are unsupported. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="lq-enter">{children}</div>;
}
