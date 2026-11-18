import { Resend } from "resend";
import { getEnv } from "./env";
import { fullPostText, type Post, type Settings } from "./schemas";
import { formatDateTime, planReminder } from "./time";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderSubject(template: string, vars: { title: string; platform: string; time: string }): string {
  return template
    .replace(/\{\{\s*title\s*\}\}/g, vars.title)
    .replace(/\{\{\s*platform\s*\}\}/g, vars.platform)
    .replace(/\{\{\s*time\s*\}\}/g, vars.time);
}

export type EmailKind = "confirmation" | "reminder" | "test";

export function renderEmailHtml(kind: EmailKind, post: Post, settings: Settings, appUrl: string): string {
  const time = formatDateTimeIn(post.scheduledAt, settings.timezone);
  const heading =
    kind === "confirmation" ? "Your post is scheduled" : kind === "test" ? "Test email" : "Time to publish your post";
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:90px;vertical-align:top">${label}</td><td style="padding:6px 0;color:#111827;font-size:14px">${value}</td></tr>`;
  const caption = settings.includeCaption
    ? `<div style="margin:20px 0 0;padding:16px;background:#f5f3ff;border-radius:12px;color:#1f2937;font-size:15px;line-height:1.55;white-space:pre-wrap">${escapeHtml(post.caption)}</div>` +
      (post.hashtags.length
        ? `<p style="margin:12px 0 0;color:#6d28d9;font-size:14px;line-height:1.6">${post.hashtags.map((t) => `#${escapeHtml(t)}`).join(" ")}</p>`
        : "")
    : "";
  const notes = post.notes
    ? `<p style="margin:16px 0 0;color:#374151;font-size:14px;line-height:1.5"><strong>Notes:</strong> ${escapeHtml(post.notes)}</p>`
    : "";
  const signature = settings.signature
    ? `<p style="margin:24px 0 0;color:#6b7280;font-size:13px;white-space:pre-wrap">${escapeHtml(settings.signature)}</p>`
    : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#ec4899);background-color:#7c3aed;padding:24px 28px;color:#ffffff;font-size:20px;font-weight:700">${heading}</td></tr>
<tr><td style="padding:24px 28px">
<h1 style="margin:0 0 12px;font-size:20px;color:#111827">${escapeHtml(post.title)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${row("Platform", escapeHtml(post.platform))}${row("When", escapeHtml(time))}</table>
${caption}${notes}
<p style="margin:28px 0 0"><a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">Open app</a></p>
${signature}
</td></tr></table></td></tr></table></body></html>`;
}

function formatDateTimeIn(iso: string, tz: string): string {
  return `${formatDateTime(iso, tz)} (${tz})`;
}

function textFallback(post: Post, settings: Settings): string {
  const lines = [post.title, `${post.platform} — ${formatDateTimeIn(post.scheduledAt, settings.timezone)}`];
  if (settings.includeCaption) lines.push("", fullPostText(post.caption, post.hashtags));
  if (post.notes) lines.push("", `Notes: ${post.notes}`);
  if (settings.signature) lines.push("", settings.signature);
  return lines.join("\n");
}

function client(): Resend {
  return new Resend(getEnv().RESEND_API_KEY);
}

interface SendArgs {
  kind: EmailKind;
  post: Post;
  settings: Settings;
  to: string;
  scheduledAt?: Date;
}

export async function sendEmail({ kind, post, settings, to, scheduledAt }: SendArgs): Promise<string> {
  const env = getEnv();
  const time = formatDateTimeIn(post.scheduledAt, settings.timezone);
  const base = renderSubject(settings.subjectTemplate, { title: post.title, platform: post.platform, time });
  const subject =
    kind === "confirmation" ? `Post scheduled: ${post.title} (${post.platform}, ${time})` : kind === "test" ? `[Test] ${base}` : base;
  const { data, error } = await client().emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html: renderEmailHtml(kind, post, settings, env.NEXT_PUBLIC_APP_URL),
    text: textFallback(post, settings),
    ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
  });
  if (error || !data) throw new Error(error?.message ?? "Resend returned no data");
  return data.id;
}

export async function cancelEmail(emailId: string): Promise<void> {
  const { error } = await client().emails.cancel(emailId);
  if (error) throw new Error(error.message);
}

export interface ScheduleOutcome {
  emailId?: string;
  warnings: string[];
}

export function effectiveRecipient(settings: Settings, accountEmail: string): string {
  return settings.recipientEmail || accountEmail;
}

/**
 * Sends the instant confirmation and queues the reminder. Never throws:
 * failures become warnings so the post itself is still saved.
 */
export async function notifyForPost(post: Post, settings: Settings, accountEmail: string, opts: { confirmation: boolean }): Promise<ScheduleOutcome> {
  const warnings: string[] = [];
  if (!settings.notificationsEnabled || !post.notify.enabled) return { warnings };
  const to = effectiveRecipient(settings, accountEmail);

  if (opts.confirmation) {
    try {
      await sendEmail({ kind: "confirmation", post, settings, to });
    } catch (err) {
      warnings.push(`Confirmation email failed: ${errMsg(err)}`);
    }
  }

  const plan = planReminder(post.scheduledAt, post.notify.leadMinutes);
  if (plan.kind === "expired") return { warnings };
  if (plan.kind === "beyond-window") {
    warnings.push(
      "The reminder is more than 30 days away, so only the confirmation was sent. The daily dispatcher will queue the reminder once it is within 30 days.",
    );
    return { warnings };
  }
  try {
    const emailId = await sendEmail({
      kind: "reminder",
      post,
      settings,
      to,
      scheduledAt: plan.kind === "scheduled" ? plan.sendAt : undefined,
    });
    return { emailId, warnings };
  } catch (err) {
    warnings.push(`Reminder email failed: ${errMsg(err)}`);
    return { warnings };
  }
}

export function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
