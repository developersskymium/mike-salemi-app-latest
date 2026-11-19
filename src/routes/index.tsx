import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Immersion is the home of the app — landing on "/" takes you straight there.
 * Unauthenticated visitors are then bounced to /auth by the protected layout.
 */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mike Salemi — Training Academy" },
      {
        name: "description",
        content:
          "Your Mike Salemi home: every program, your real progress and what to train next.",
      },
      { property: "og:title", content: "Mike Salemi — Training Academy" },
      {
        property: "og:description",
        content: "Your Mike Salemi home: every program, your real progress and what to train next.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/home" });
  },
});
