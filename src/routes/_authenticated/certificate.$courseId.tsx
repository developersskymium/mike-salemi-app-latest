import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Printer } from "lucide-react";
import { getAchievements } from "@/lib/achievements.functions";
import { useIdentity } from "@/components/identity";
import { courses } from "@/content/program";
import { Spinner, buttonStyles } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/certificate/$courseId")({
  head: () => ({
    meta: [
      { title: "Certificate — Mike Salemi App" },
      {
        name: "description",
        content: "Your printable Kettlebell Lifestyle certificate of completion.",
      },
      { property: "og:title", content: "Certificate — Mike Salemi App" },
      { property: "og:description", content: "A printable certificate of completion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CertificatePage,
});

/** Short, stable verification ID derived from the certificate row id. */
function verificationId(raw: string) {
  const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `KBL-${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
}

/** Embossed seal: a kettlebell glyph inside a double ring. */
function Seal() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className="h-20 w-20 sm:h-24 sm:w-24">
      <circle
        cx="60"
        cy="60"
        r="56"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
      <circle cx="60" cy="60" r="49" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle
        cx="60"
        cy="60"
        r="43"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.5"
      />
      {Array.from({ length: 48 }).map((_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={60 + Math.cos(a) * 49}
            y1={60 + Math.sin(a) * 49}
            x2={60 + Math.cos(a) * 53}
            y2={60 + Math.sin(a) * 53}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.4"
          />
        );
      })}
      {/* kettlebell */}
      <path
        d="M52 44 a8 8 0 0 1 16 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M60 50 c-13 0 -20 10 -20 20 a20 20 0 0 0 40 0 c0 -10 -7 -20 -20 -20 z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Scopes the A4 landscape page box to this route only. */
function useLandscapePrint() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "@page { size: A4 landscape; margin: 12mm; }";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
}

function CertificatePage() {
  useLandscapePrint();
  const { courseId } = Route.useParams();
  const fetchAchievements = useServerFn(getAchievements);
  const identity = useIdentity();

  const achievements = useQuery({ queryKey: ["achievements"], queryFn: () => fetchAchievements() });

  const certificate = (achievements.data?.certificates ?? []).find((c) => c.course_id === courseId);
  const course = courses.find((c) => c.id === courseId);
  const name = identity.name || "Kettlebell Lifestyle Athlete";

  if (achievements.isLoading || identity.loading || identity.profileLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl text-foreground">Certificate not available yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Finish every day of {course?.title ?? "this level"} to unlock it.
          </p>
          <Link to="/account" className={cn(buttonStyles.outline, "mt-6")}>
            <ArrowLeft className="h-4 w-4" /> Back to profile
          </Link>
        </div>
      </div>
    );
  }

  const issued = new Date(certificate.issued_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const phases = course?.phases ?? [];

  return (
    <div className="min-h-screen bg-background px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-[62rem] items-center justify-between gap-3 print:hidden">
        <Link to="/account" className={buttonStyles.ghost}>
          <ArrowLeft className="h-4 w-4" /> Profile
        </Link>
        <button type="button" onClick={() => window.print()} className={buttonStyles.primary}>
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <article className="print-sheet certificate-sheet mx-auto mt-6 w-full max-w-[62rem] bg-surface p-3 print:mt-0 print:bg-white sm:p-4">
        {/* engraved double rule */}
        <div className="h-full border border-foreground/25 p-[3px]">
          <div className="relative flex h-full flex-col items-center border border-foreground/60 px-6 py-10 text-center sm:px-14 sm:py-14">
            {/* corner marks */}
            {[
              "left-3 top-3 border-l border-t",
              "right-3 top-3 border-r border-t",
              "left-3 bottom-3 border-b border-l",
              "right-3 bottom-3 border-b border-r",
            ].map((pos) => (
              <span
                key={pos}
                className={cn("pointer-events-none absolute h-5 w-5 border-foreground/40", pos)}
              />
            ))}

            <p className="text-[0.625rem] uppercase tracking-[0.55em] text-muted-foreground">
              Kettlebell Lifestyle
            </p>
            <p className="mt-1 text-[0.625rem] uppercase tracking-[0.3em] text-muted-foreground">
              Mike Salemi
            </p>

            <div className="mt-6 text-foreground/70">
              <Seal />
            </div>

            <p className="mt-6 text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Certificate of Completion
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              This is to certify that
            </p>

            <h1 className="mt-3 font-serif text-3xl italic leading-tight text-foreground sm:text-5xl">
              {name}
            </h1>
            <div className="mt-4 h-px w-56 max-w-full bg-foreground/30" />

            <p className="mt-5 max-w-xl text-sm text-muted-foreground sm:text-base">
              has completed every phase, day and lesson of
            </p>
            <p className="mt-2 text-lg font-semibold uppercase tracking-[0.15em] text-foreground sm:text-2xl">
              {certificate.title.replace(/^Kettlebell Lifestyle\s*[—-]\s*/i, "")}
            </p>

            {phases.length > 0 && (
              <p className="mt-5 max-w-2xl text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
                {phases.map((p) => p.label).join("  ·  ")}
              </p>
            )}

            <div className="mt-auto grid w-full max-w-2xl grid-cols-2 gap-10 pt-12 text-left">
              <div>
                <p className="numeric pb-2 text-sm text-foreground">{issued}</p>
                <p className="border-t border-foreground/40 pt-2 text-[0.625rem] uppercase tracking-[0.25em] text-muted-foreground">
                  Date issued
                </p>
              </div>
              <div>
                <p className="pb-2 font-serif text-xl italic text-foreground">Mike Salemi</p>
                <p className="border-t border-foreground/40 pt-2 text-[0.625rem] uppercase tracking-[0.25em] text-muted-foreground">
                  Program author
                </p>
              </div>
            </div>

            <p className="numeric mt-6 text-[0.625rem] uppercase tracking-[0.3em] text-muted-foreground">
              Verification {verificationId(certificate.id)}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
