import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSettings, markAllPastSent, postsNeedingReminder, setEmailId } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { errMsg, notifyForPost } from "@/lib/email";
import { defaultSettings, type Settings } from "@/lib/schemas";
import { planReminder } from "@/lib/time";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: Request, secret: string): boolean {
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Safety net (daily on Vercel Hobby). Reminders are normally queued with Resend's native
 * `scheduledAt`; this queues any that were deferred (>30 days out) or failed, and marks past posts sent.
 */
export async function GET(req: Request): Promise<Response> {
  try {
    const env = getEnv();
    if (!authorized(req, env.CRON_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const markedSent = await markAllPastSent();
    const settingsCache = new Map<string, Settings>();
    let queued = 0;
    const warnings: string[] = [];

    for (const { email, post } of await postsNeedingReminder()) {
      const plan = planReminder(post.scheduledAt, post.notify.leadMinutes);
      if (plan.kind !== "immediate" && plan.kind !== "scheduled") continue;
      let settings = settingsCache.get(email);
      if (!settings) {
        settings = (await getSettings(email)) ?? defaultSettings(email);
        settingsCache.set(email, settings);
      }
      const outcome = await notifyForPost(post, settings, email, { confirmation: false });
      warnings.push(...outcome.warnings);
      if (outcome.emailId) {
        await setEmailId(email, post.id, outcome.emailId);
        queued++;
      }
    }
    return NextResponse.json({ ok: true, markedSent, queued, warnings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
