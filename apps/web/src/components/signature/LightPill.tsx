import { Button, type ButtonProps } from "../ui/Button";

/**
 * The one primary action on a screen. Glacier by default ("do this"); `tone="ember"` for resume and
 * progress actions. Same API as Button (href renders a Link). `streak` is accepted and ignored.
 */
export function LightPill({ tone = "glacier", streak: _streak, ...props }: Omit<ButtonProps, "variant"> & { streak?: boolean; tone?: "glacier" | "ember" }) {
  return <Button {...(props as ButtonProps)} variant={tone === "ember" ? "warm" : "filled"} />;
}
