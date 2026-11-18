"use client";

import { useEffect, useMemo, useState } from "react";
import { PLATFORMS, type Platform, type Post } from "@/lib/schemas";
import { formatDateTime } from "@/lib/time";

const BAR_COLORS: Record<Platform, string> = {
  Instagram: "bg-pink-500",
  LinkedIn: "bg-sky-500",
  X: "bg-neutral-700",
  Facebook: "bg-blue-600",
  TikTok: "bg-teal-500",
};

function relative(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 1) return "any moment";
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `in ${d} day${d === 1 ? "" : "s"}`;
}

interface Props {
  posts: Post[];
  loading: boolean;
  timezone: string;
}

export function StatsRow({ posts, loading, timezone }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const s = useMemo(() => {
    const upcoming = posts.filter((p) => new Date(p.scheduledAt).getTime() > now).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    const mix = PLATFORMS.map((p) => ({ platform: p, count: posts.filter((x) => x.platform === p).length })).filter((x) => x.count > 0);
    return { total: posts.length, upcoming, past: posts.length - upcoming.length, next: upcoming[0], mix };
  }, [posts, now]);

  const cards = [
    { label: "Total posts", value: s.total, icon: "🗂️", tone: "from-violet-500/15 to-violet-500/0" },
    { label: "Upcoming", value: s.upcoming.length, icon: "⏰", tone: "from-pink-500/15 to-pink-500/0" },
    { label: "Published", value: s.past, icon: "✅", tone: "from-emerald-500/15 to-emerald-500/0" },
  ];

  return (
    <section aria-label="Overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`card relative overflow-hidden bg-gradient-to-br p-4 ${c.tone}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</p>
            <span aria-hidden>{c.icon}</span>
          </div>
          {loading ? <div className="skeleton mt-3 h-8 w-14" /> : <p className="mt-2 text-3xl font-extrabold tabular-nums">{c.value}</p>}
        </div>
      ))}

      <div className="card accent-gradient relative overflow-hidden border-0 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Next up</p>
        {loading ? (
          <div className="skeleton mt-3 h-8 w-28 !bg-white/30" />
        ) : s.next ? (
          <>
            <p className="mt-2 truncate text-lg font-bold">{s.next.title}</p>
            <p className="text-sm text-white/85">
              {relative(new Date(s.next.scheduledAt).getTime() - now)} · {formatDateTime(s.next.scheduledAt, timezone)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/90">Nothing queued. Create your next post.</p>
        )}
      </div>

      {s.mix.length > 0 && !loading && (
        <div className="card p-4 sm:col-span-2 xl:col-span-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Platform mix</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {s.mix.map((m) => (
                <li key={m.platform} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${BAR_COLORS[m.platform]}`} aria-hidden />
                  {m.platform} <span className="font-semibold text-fg">{m.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted-bg" role="img" aria-label="Posts per platform">
            {s.mix.map((m) => (
              <div key={m.platform} className={BAR_COLORS[m.platform]} style={{ width: `${(m.count / s.total) * 100}%` }} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
