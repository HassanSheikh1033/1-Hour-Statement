import { withAuth, parseBody, json, errorJson } from "@/lib/api";
import { getSettings, saveSettings } from "@/lib/db";
import { settingsSchema, isValidTimezone, defaultSettings } from "@/lib/schemas";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, ctx) => {
  const saved = await getSettings(ctx.email);
  return json({ settings: saved ?? defaultSettings(ctx.email), exists: saved !== null, accountEmail: ctx.email });
});

export const PUT = withAuth(async (req, ctx) => {
  const settings = await parseBody(req, settingsSchema);
  if (!isValidTimezone(settings.timezone)) return errorJson("Unknown timezone", 400);
  await saveSettings(ctx.email, settings);
  return json({ settings });
});
