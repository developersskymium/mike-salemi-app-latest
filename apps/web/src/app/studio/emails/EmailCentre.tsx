"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Glass, Icon, Segmented, useToast } from "@/components/ui";
import type { EmailGroup, EmailKindInfo } from "@/lib/email/catalog";
import type { EmailKind } from "@/lib/email/templates";
import { sendCatalogTest } from "./actions";

export interface OutboxRow {
  id: string;
  kind: string;
  status: "pending" | "sent" | "failed" | "skipped" | "not_configured";
  subject: string | null;
  to_email: string | null;
  last_error: string | null;
  attempts: number;
  created_at: string;
  sent_at: string | null;
}

type Preview = { subject: string; html: string; text: string; preheader: string };
type Status = { configured: boolean; from: string; fromMike: string; appUrl: string; cronSecret: boolean; serviceRole: boolean; push: boolean };

const STATUS_LABEL: Record<OutboxRow["status"], string> = { pending: "Queued", sent: "Sent", failed: "Failed", skipped: "Skipped", not_configured: "Not configured" };

/** In the preview, links are decoration: strip hrefs so clicking never navigates the frame. */
const inert = (html: string, mode: "light" | "dark" | "text") =>
  html.replace("@media (prefers-color-scheme:dark){", mode === "dark" ? "@media all{" : "@media not all{").replace(/\shref\s*=\s*("[^"]*"|'[^']*')/gi, "").replace("</head>", "<style>a{pointer-events:none!important;cursor:default!important}</style></head>");

function Check({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="eml-check" data-ok={ok || undefined}>
      <span className="eml-dot" aria-hidden>{ok ? <Icon name="check" size="xs" /> : <Icon name="clock" size="xs" />}</span>
      <span><b>{label}</b><small>{detail}</small></span>
    </li>
  );
}

export function EmailCentre({ kinds, groups, previews, status, adminEmail, log }: { kinds: EmailKindInfo[]; groups: EmailGroup[]; previews: Record<string, Preview>; status: Status; adminEmail: string; log: OutboxRow[] }) {
  const [kind, setKind] = useState<EmailKind>("welcome");
  const [mode, setMode] = useState<"light" | "dark" | "text">("light");
  const [width, setWidth] = useState<"desktop" | "phone">("desktop");
  const [pending, start] = useTransition();
  const toast = useToast();
  const info = kinds.find((k) => k.id === kind)!;
  const pv = previews[kind]!;
  const html = useMemo(() => inert(pv.html, mode), [pv.html, mode]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of log) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [log]);

  const test = () =>
    start(async () => {
      const r = await sendCatalogTest(kind);
      if (r.status === "sent") toast(`Test sent to ${r.to}`, { tone: "success", icon: "check" });
      else if (r.status === "not_configured") toast("Not sent: Resend isn't configured yet. The attempt is logged below.", { icon: "clock", duration: 5000 });
      else toast(r.error ?? "Sending failed", { icon: "close" });
    });

  return (
    <div className="eml">
      <Glass className="eml-status" data-ok={status.configured || undefined} role="status">
        <div className="eml-status-head">
          <span className="eml-badge" data-ok={status.configured || undefined}>{status.configured ? "Live" : "Not configured"}</span>
          <div>
            <b>{status.configured ? "Emails are sending through Resend" : "Emails are queued, not sent"}</b>
            <p>
              {status.configured
                ? `From ${status.from} and ${status.fromMike}.`
                : "Every trigger already writes to the outbox and is rendered; the final send logs “not configured” until RESEND_API_KEY is set. Welcome, rewards, certificates, tool results and schedules from the last 3 days go out automatically once it is."}
            </p>
          </div>
        </div>
        <ul className="eml-checks">
          <Check ok={status.configured} label="Resend" detail={status.configured ? "RESEND_API_KEY set" : "Set RESEND_API_KEY and RESEND_FROM_EMAIL"} />
          <Check ok={status.cronSecret} label="Cron" detail={status.cronSecret ? "CRON_SECRET set" : "Set CRON_SECRET (Vercel Cron)"} />
          <Check ok={status.serviceRole} label="Outbox access" detail={status.serviceRole ? "Service key set" : "SUPABASE_SERVICE_ROLE_KEY missing"} />
          <Check ok={status.push} label="Web push" detail={status.push ? "VAPID keys set" : "Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY"} />
        </ul>
      </Glass>

      <div className="eml-grid">
        <nav className="eml-list" aria-label="Emails">
          {groups.map((g) => {
            const items = kinds.filter((k) => k.group === g);
            if (!items.length) return null;
            return (
              <div key={g} className="eml-group">
                <p className="eml-group-t">{g}</p>
                {items.map((k) => (
                  <button key={k.id} type="button" className="eml-item" aria-current={k.id === kind ? "true" : undefined} onClick={() => setKind(k.id)}>
                    <Icon name="bell" size="sm" />
                    <span>
                      <b>{k.label}</b>
                      <small>{k.sender}</small>
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="eml-main">
          <Glass className="eml-subject">
            <div className="eml-subject-main">
              <p className="eml-k">Subject</p>
              <p className="eml-s">{pv.subject}</p>
              <p className="eml-meta">From {info.sender} · {info.trigger}</p>
              <p className="eml-meta">Preheader: {pv.preheader} · Trigger: <code>{info.source}</code></p>
            </div>
            <Button size="md" icon="share" onClick={test} disabled={pending}>{pending ? "Sending…" : "Send me a test"}</Button>
          </Glass>
          <div className="eml-toolbar">
            <Segmented label="Preview mode" size="sm" variant="fill" value={mode} onChange={setMode} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "text", label: "Plain text" }]} />
            <Segmented label="Preview width" size="sm" variant="fill" value={width} onChange={setWidth} options={[{ value: "desktop", label: "Desktop" }, { value: "phone", label: "Phone" }]} />
            <span className="eml-to">Tests go to {adminEmail}</span>
          </div>
          <div className="eml-frame" data-width={width}>
            {mode === "text" ? (
              <pre className="eml-text">{pv.text}</pre>
            ) : (
              <iframe key={`${kind}-${mode}`} title={`${info.label} email preview`} srcDoc={html} sandbox="" />
            )}
          </div>
        </div>
      </div>

      <Glass className="eml-log">
        <h2>Outbox <span>{log.length ? Object.entries(counts).map(([s, n]) => `${n} ${STATUS_LABEL[s as OutboxRow["status"]].toLowerCase()}`).join(" · ") : "empty"}</span></h2>
        {log.length ? (
          <div className="st-scroll">
            <table className="st-tbl">
              <thead><tr><th>When</th><th>Email</th><th>To</th><th>Status</th><th>Note</th></tr></thead>
              <tbody>
                {log.map((r) => (
                  <tr key={r.id}>
                    <td className="lq-num">{new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                    <td>{r.subject ?? kinds.find((k) => k.id === r.kind)?.label ?? r.kind}</td>
                    <td>{r.to_email ?? "—"}</td>
                    <td><span className="eml-badge" data-ok={r.status === "sent" || undefined} data-s={r.status}>{STATUS_LABEL[r.status]}</span></td>
                    <td className="eml-note">{r.last_error ?? (r.attempts > 1 ? `${r.attempts} attempts` : "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="st-empty">Nothing queued yet. Emails appear here as members trigger them.</div>
        )}
      </Glass>
    </div>
  );
}
