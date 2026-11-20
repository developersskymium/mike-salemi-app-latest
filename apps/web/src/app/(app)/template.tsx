/**
 * Re-mounts per navigation: the page rises out of a soft blur (Trace "rise"), as the CSS fallback
 * where View Transitions are unsupported. Off with reduced motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="lq-enter">{children}</div>;
}
