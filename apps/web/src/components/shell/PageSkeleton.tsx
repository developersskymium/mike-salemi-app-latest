import { Skeleton, SkeletonText } from "../ui/Skeleton";

/**
 * Instant loading frames (loading.tsx): shown the moment a link is tapped, in the shape of the
 * page that is coming, so navigation never feels stuck. Fixed heights keep layout shift at zero.
 */
export function PageSkeleton({ kind = "grid", label = "Loading" }: { kind?: "grid" | "hero" | "detail" | "list" | "player" | "form"; label?: string }) {
  return (
    <div className="sm-loading" aria-busy="true" aria-label={label} role="status">
      {kind !== "player" && (
        <div style={{ display: "grid", gap: 10 }}>
          <Skeleton shape="text" width={140} />
          <Skeleton shape="title" width="min(380px, 70%)" height={36} />
        </div>
      )}
      {(kind === "hero" || kind === "detail") && <Skeleton shape="card" height={kind === "hero" ? 420 : 340} style={{ borderRadius: "var(--r-hero)" }} />}
      {kind === "player" && <Skeleton shape="card" style={{ aspectRatio: "16 / 9", borderRadius: 22 }} />}
      {(kind === "grid" || kind === "hero") && (
        <div className="sm-loading-row">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ display: "grid", gap: 10 }}>
              <Skeleton shape="card" style={{ aspectRatio: "16 / 10" }} />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      )}
      {(kind === "detail" || kind === "list" || kind === "player") && (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: kind === "list" ? 7 : 4 }, (_, i) => (
            <Skeleton key={i} shape="card" height={68} />
          ))}
        </div>
      )}
      {kind === "form" && (
        <div style={{ display: "grid", gap: 14, maxWidth: 560 }}>
          <Skeleton shape="card" height={56} />
          <Skeleton shape="card" height={56} />
          <Skeleton shape="card" height={120} />
          <Skeleton shape="card" height={52} width={200} style={{ borderRadius: 999 }} />
        </div>
      )}
    </div>
  );
}
