import { cn } from "@/lib/utils";

/**
 * Flat, hairline kettlebell illustration with the weight set into the bell.
 * Purely presentational — scales with the `size` prop.
 */
export function KettlebellGlyph({
  weight,
  unit = "kg",
  emphasis = false,
  size = 132,
  className,
}: {
  weight: string;
  unit?: string;
  emphasis?: boolean;
  size?: number;
  className?: string;
}) {
  const long = weight.length > 2;
  return (
    <svg
      viewBox="0 0 100 104"
      width={size}
      height={size * 1.04}
      role="img"
      aria-label={`${weight} ${unit} kettlebell`}
      className={cn("overflow-visible", className)}
    >
      {/* handle */}
      <path
        d="M31 46 C27 16, 73 16, 69 46"
        fill="none"
        stroke="currentColor"
        strokeWidth={9}
        strokeLinecap="round"
        className={emphasis ? "text-primary" : "text-foreground/35"}
      />
      {/* bell body */}
      <path
        d="M50 38 C72 38 88 56 88 74 C88 87 79 94 68 94 L32 94 C21 94 12 87 12 74 C12 56 28 38 50 38 Z"
        className={emphasis ? "fill-primary text-primary" : "fill-secondary text-border"}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      {/* window */}
      <path
        d="M35 44 C33 52 30 56 26 60"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className={emphasis ? "text-primary-foreground/40" : "text-foreground/15"}
      />
      <text
        x="50"
        y="72"
        textAnchor="middle"
        className={cn(
          "numeric font-semibold",
          emphasis ? "fill-primary-foreground" : "fill-foreground",
        )}
        style={{ fontSize: long ? 17 : 21, letterSpacing: "-0.02em" }}
      >
        {weight}
      </text>
      <text
        x="50"
        y="85"
        textAnchor="middle"
        className={emphasis ? "fill-primary-foreground/70" : "fill-muted-foreground"}
        style={{ fontSize: 9, letterSpacing: "0.14em" }}
      >
        {unit.toUpperCase()}
      </text>
    </svg>
  );
}
