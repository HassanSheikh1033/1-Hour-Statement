import { PLATFORM_LIMITS, fullPostText, type Platform } from "@/lib/schemas";

const PLATFORM_COLORS: Record<Platform, string> = {
  Instagram: "bg-pink-500/15 text-pink-600",
  LinkedIn: "bg-sky-500/15 text-sky-700",
  X: "bg-neutral-500/15 text-neutral-700",
  Facebook: "bg-blue-500/15 text-blue-700",
  TikTok: "bg-teal-500/15 text-teal-700",
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLATFORM_COLORS[platform]}`}>{platform}</span>;
}

const STATUS_STYLES = {
  scheduled: "bg-violet-500/15 text-violet-700",
  sent: "bg-emerald-500/15 text-emerald-700",
  draft: "bg-amber-500/15 text-amber-700",
} as const;

export function StatusChip({ status }: { status: keyof typeof STATUS_STYLES }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}>{status}</span>;
}

export function CharCounter({ platform, caption, hashtags }: { platform: Platform; caption: string; hashtags: string[] }) {
  const limit = PLATFORM_LIMITS[platform];
  const count = fullPostText(caption, hashtags).length;
  const over = count > limit;
  return (
    <span
      className={`text-xs tabular-nums ${over ? "font-semibold text-danger" : "text-muted"}`}
      role={over ? "alert" : undefined}
      aria-live="polite"
    >
      {count.toLocaleString()} / {limit.toLocaleString()}
      {over ? ` — ${(count - limit).toLocaleString()} over the ${platform} limit` : ""}
    </span>
  );
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}
