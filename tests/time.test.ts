import { describe, expect, it } from "vitest";
import { planReminder, localInputToIso, toLocalInputValue, RESEND_MAX_SCHEDULE_MS } from "../lib/time";

const now = new Date("2026-01-01T12:00:00.000Z");
const at = (ms: number) => new Date(now.getTime() + ms).toISOString();

describe("planReminder", () => {
  it("queues with Resend when the reminder time is in the future", () => {
    const plan = planReminder(at(2 * 3600_000), 15, now);
    expect(plan.kind).toBe("scheduled");
    expect(plan.sendAt.toISOString()).toBe(at(2 * 3600_000 - 15 * 60_000));
  });

  it("sends immediately when (scheduledAt - lead) is already past", () => {
    const plan = planReminder(at(10 * 60_000), 60, now); // post in 10 min, 60 min lead
    expect(plan.kind).toBe("immediate");
  });

  it("treats lead 0 with a future post as scheduled at post time", () => {
    expect(planReminder(at(5 * 60_000), 0, now).kind).toBe("scheduled");
  });

  it("flags reminders more than 30 days out", () => {
    expect(planReminder(at(RESEND_MAX_SCHEDULE_MS + 3600_000), 0, now).kind).toBe("beyond-window");
  });

  it("returns expired when the post time has passed", () => {
    expect(planReminder(at(-1000), 15, now).kind).toBe("expired");
  });

  it("a long lead can pull a far-future post back inside the window", () => {
    const post = RESEND_MAX_SCHEDULE_MS + 3 * 3600_000;
    expect(planReminder(at(post), 1440, now).kind).toBe("scheduled");
  });
});

describe("local <-> UTC conversion", () => {
  it("round-trips a datetime-local value", () => {
    const iso = localInputToIso("2026-06-15T09:30");
    expect(iso).not.toBeNull();
    expect(toLocalInputValue(iso as string)).toBe("2026-06-15T09:30");
  });
  it("rejects empty/invalid input", () => {
    expect(localInputToIso("")).toBeNull();
    expect(localInputToIso("nope")).toBeNull();
  });
});
