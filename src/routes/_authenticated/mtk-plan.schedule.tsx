import { createFileRoute, redirect } from "@tanstack/react-router";

// Schedule setup now lives on the Results page.
export const Route = createFileRoute("/_authenticated/mtk-plan/schedule")({
  beforeLoad: () => {
    throw redirect({ to: "/mtk-plan/results", hash: "schedule", replace: true });
  },
});
