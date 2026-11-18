import { withAuth, parseBody, json, errorJson, loadSettings } from "@/lib/api";
import { effectiveRecipient, sendEmail, errMsg } from "@/lib/email";
import { testEmailSchema, type Post } from "@/lib/schemas";

export const runtime = "nodejs";

export const POST = withAuth(async (req, ctx) => {
  const { settings: override } = await parseBody(req, testEmailSchema);
  const settings = override ?? (await loadSettings(ctx));
  const nowIso = new Date().toISOString();
  const sample: Post = {
    id: "test",
    title: "Sample post: launch day",
    caption: "This is how your reminder emails will look. ✨\n\nYour caption appears here when 'include caption' is on.",
    hashtags: ["launch", "socialmedia"],
    platform: "Instagram",
    scheduledAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    notes: "Notes you add to a post show up like this.",
    status: "scheduled",
    notify: { enabled: true, leadMinutes: settings.defaultLeadMinutes },
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const to = effectiveRecipient(settings, ctx.email);
  try {
    await sendEmail({ kind: "test", post: sample, settings, to });
  } catch (err) {
    return errorJson(`Couldn't send the test email: ${errMsg(err)}`, 502);
  }
  return json({ ok: true, to });
});
