import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * iOS-style switch: 51×31 track, spring thumb travel, tokenised colours so it
 * reads correctly in both themes and picks up section accents.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer group relative box-border inline-flex h-[31px] w-[51px] min-w-[51px] shrink-0 grow-0 basis-[51px] cursor-pointer items-center overflow-hidden rounded-full border border-hairline",
      "transition-colors duration-300 [transition-timing-function:var(--ease-ios)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-40",
      "data-[state=unchecked]:bg-secondary data-[state=checked]:border-primary data-[state=checked]:bg-primary",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute left-[2px] top-1/2 block h-[25px] w-[25px] -translate-y-1/2 rounded-full bg-background",
        "shadow-[0_1px_3px_rgba(0,0,0,0.28)] ring-0",
        "transition-[left] duration-300 [transition-timing-function:var(--ease-spring)]",
        "data-[state=checked]:left-[22px]",
      )}
    />
  </SwitchPrimitives.Root>

));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
