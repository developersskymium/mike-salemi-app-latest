import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHead, Section } from "@/components/page-kit";
import { renderEmailPreview, sendCatalogTestEmail } from "@/lib/email.functions";
import { EMAIL_GROUPS, EMAIL_KINDS, type EmailKindId } from "@/lib/email-kinds";

export const Route = createFileRoute("/_authenticated/emails/")({
  head: () => ({
    meta: [
      { title: "Email preview — Mike Salemi App" },
      {
        name: "description",
        content: "Preview and test every email the app sends, from tool results to reminders.",
      },
      { property: "og:title", content: "Email preview — Mike Salemi App" },
      { property: "og:description", content: "Preview and send a test of every app email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmailsPage,
});

function EmailsPage() {
  const [kind, setKind] = useState<EmailKindId>("tool_result");
  const preview = useServerFn(renderEmailPreview);
  const sendTest = useServerFn(sendCatalogTestEmail);

  const info = EMAIL_KINDS.find((k) => k.id === kind)!;

  const { data, isFetching } = useQuery({
    queryKey: ["email-preview", kind],
    queryFn: () => preview({ data: { kind } }),
  });

  /**
   * In the preview, links are decoration only — clicking one used to navigate
   * the iframe away to a dead page. Strip every href so buttons stay inert.
   */
  const previewHtml = (data?.html ?? "")
    .replace(/\shref\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/\starget\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .concat(
      "<style>a{pointer-events:none !important;cursor:default !important;text-decoration:none}</style>",
    );



  const testMutation = useMutation({
    mutationFn: () => sendTest({ data: { kind } }),
    onSuccess: (result) => {
      if (result.sent) toast.success(`Test email sent to ${result.to}`);
      else toast.error("Couldn't send — no email on your account.");
    },
    onError: () => toast.error("Sending failed. Check the email settings and try again."),
  });

  return (
    <AppShell>
      <div className="animate-page">
        <PageHead
          eyebrow="Email centre"
          title="Every email we send"
          lede="Pick any email to see exactly what lands in an inbox, then send yourself a live copy to check it end to end."
          meta={`${EMAIL_KINDS.length} email types · sent from your own domain`}
        />

        <Section tight>
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Email list */}
            <div className="space-y-6">
              {EMAIL_GROUPS.map((group) => {
                const items = EMAIL_KINDS.filter((k) => k.group === group);
                if (!items.length) return null;
                return (
                  <div key={group}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {group}
                    </p>
                    <div className="space-y-1.5">
                      {items.map((item) => {
                        const active = item.id === kind;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setKind(item.id)}
                            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                              active
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-card hover:border-foreground/40"
                            }`}
                          >
                            <Mail className="size-4 shrink-0 opacity-70" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">{item.label}</span>
                              <span
                                className={`block truncate text-xs ${active ? "opacity-70" : "text-muted-foreground"}`}
                              >
                                {item.sender}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Preview pane */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Subject
                    </p>
                    <p className="mt-1 text-lg font-semibold leading-snug">{data?.subject ?? "Loading…"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      From {info.sender} · {info.trigger}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => testMutation.mutate()}
                    disabled={testMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Send me a test
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
                {isFetching && !data ? (
                  <div className="flex h-[640px] items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" /> Rendering preview…
                  </div>
                ) : (
                  <iframe
                    key={kind}
                    title={`${info.label} email preview`}
                    srcDoc={previewHtml}
                    sandbox=""
                    className="h-[720px] w-full bg-white"
                  />
                )}
              </div>
            </div>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
