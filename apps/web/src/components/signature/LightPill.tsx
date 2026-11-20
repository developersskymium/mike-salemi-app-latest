import { Button, type ButtonProps } from "../ui/Button";

/**
 * The one primary action: a pill of glacier light with a streak passing across it and a 96%
 * press. Same API as Button (href renders a Link); `streak={false}` for rows of repeated pills.
 */
export function LightPill({ streak = true, ...props }: Omit<ButtonProps, "variant"> & { streak?: boolean }) {
  return <Button {...(props as ButtonProps)} variant="filled" streak={streak} />;
}
