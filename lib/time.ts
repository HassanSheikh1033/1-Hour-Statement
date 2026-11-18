/** Resend can only schedule emails up to 30 days ahead; keep a 1-minute safety margin. */
export const RESEND_MAX_SCHEDULE_MS = 30 * 24 * 60 * 60 * 1000 - 60_000;

/** ISO (UTC) -> value for <input type="datetime-local"> in the browser's local zone. */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (interpreted in the browser's local zone) -> ISO UTC. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value); // no zone suffix => parsed as local time
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatDateTime(iso: string, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function reminderTime(scheduledAtIso: string, leadMinutes: number): Date {
  return new Date(new Date(scheduledAtIso).getTime() - leadMinutes * 60_000);
}

export type ReminderPlan =
  | { kind: "immediate"; sendAt: Date }
  | { kind: "scheduled"; sendAt: Date }
  | { kind: "beyond-window"; sendAt: Date }
  | { kind: "expired"; sendAt: Date };

/**
 * Decides how a reminder should be delivered:
 * - expired: the post time itself has passed, a reminder is pointless
 * - immediate: reminder time (post time - lead) is already past, send now
 * - beyond-window: reminder is more than 30 days out, Resend cannot queue it
 * - scheduled: queue with Resend's `scheduledAt`
 */
export function planReminder(scheduledAtIso: string, leadMinutes: number, now: Date = new Date()): ReminderPlan {
  const sendAt = reminderTime(scheduledAtIso, leadMinutes);
  if (new Date(scheduledAtIso).getTime() <= now.getTime()) return { kind: "expired", sendAt };
  if (sendAt.getTime() <= now.getTime()) return { kind: "immediate", sendAt };
  if (sendAt.getTime() - now.getTime() > RESEND_MAX_SCHEDULE_MS) return { kind: "beyond-window", sendAt };
  return { kind: "scheduled", sendAt };
}

export function leadLabel(minutes: number): string {
  if (minutes === 0) return "At post time";
  if (minutes < 60) return `${minutes} minutes before`;
  if (minutes < 1440) return `${minutes / 60} hour${minutes === 60 ? "" : "s"} before`;
  return `${minutes / 1440} day${minutes === 1440 ? "" : "s"} before`;
}
