"use client";

import { useMemo } from "react";
import type { Post } from "@/lib/schemas";
import { PostCard } from "./PostCard";

interface Props {
  posts: Post[];
  loading: boolean;
  timezone: string;
  pendingIds: Set<string>;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
}

export function PostFeed({ posts, loading, timezone, pendingIds, onEdit, onDelete }: Props) {
  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const sorted = [...posts].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return {
      upcoming: sorted.filter((p) => new Date(p.scheduledAt).getTime() > now),
      past: sorted.filter((p) => new Date(p.scheduledAt).getTime() <= now).reverse(),
    };
  }, [posts]);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy aria-label="Loading posts">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card space-y-3 p-4">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
          <rect x="14" y="20" width="68" height="60" rx="12" className="fill-muted-bg stroke-line" strokeWidth="2" />
          <rect x="14" y="20" width="68" height="18" rx="9" className="fill-violet-500/25" />
          <circle cx="30" cy="29" r="3" className="fill-violet-500" />
          <circle cx="42" cy="29" r="3" className="fill-pink-500" />
          <rect x="26" y="50" width="30" height="5" rx="2.5" className="fill-line" />
          <rect x="26" y="62" width="44" height="5" rx="2.5" className="fill-line" />
        </svg>
        <h3 className="mt-4 font-semibold">Nothing scheduled yet</h3>
        <p className="mt-1 max-w-xs text-sm text-muted">Generate a caption on the left, pick your favourite, and schedule it. It will show up here.</p>
      </div>
    );
  }

  const renderGroup = (title: string, items: Post[]) =>
    items.length > 0 && (
      <section aria-label={title} className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
          {title} · {items.length}
        </h3>
        {items.map((p) => (
          <PostCard key={p.id} post={p} timezone={timezone} pending={pendingIds.has(p.id)} onEdit={() => onEdit(p)} onDelete={() => onDelete(p)} />
        ))}
      </section>
    );

  return (
    <div className="space-y-6">
      {renderGroup("Upcoming", upcoming)}
      {renderGroup("Past", past)}
    </div>
  );
}
