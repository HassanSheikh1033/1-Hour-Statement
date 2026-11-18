"use client";

import { useState } from "react";
import { toast } from "sonner";
import { fullPostText, type Post } from "@/lib/schemas";
import { formatDateTime } from "@/lib/time";
import { Modal } from "./Modal";
import { PlatformBadge, StatusChip } from "./ui";

interface Props {
  post: Post;
  timezone: string;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function PostCard({ post, timezone, pending, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullPostText(post.caption, post.hashtags));
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  }

  return (
    <article className={`card p-4 transition-opacity ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2">
        <PlatformBadge platform={post.platform} />
        <StatusChip status={post.status} />
        {post.emailId && <span title="Email reminder queued" className="text-xs text-muted">🔔 reminder queued</span>}
        {pending && <span className="text-xs text-muted">Saving…</span>}
      </div>
      <h3 className="mt-2 font-semibold">{post.title}</h3>
      <p className="mt-0.5 text-xs text-muted">
        <time dateTime={post.scheduledAt}>{formatDateTime(post.scheduledAt, timezone)}</time>
      </p>
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed">{post.caption}</p>
      {post.hashtags.length > 0 && (
        <p className="mt-2 text-xs font-medium text-violet-700">{post.hashtags.map((t) => `#${t}`).join(" ")}</p>
      )}
      {post.notes && <p className="mt-2 rounded-lg bg-muted-bg px-2.5 py-1.5 text-xs text-muted">📝 {post.notes}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost !py-1.5" onClick={copy}>
          Copy
        </button>
        <button type="button" className="btn btn-ghost !py-1.5" onClick={onEdit} disabled={pending}>
          Edit
        </button>
        <button type="button" className="btn btn-ghost !py-1.5 text-danger" onClick={() => setConfirming(true)} disabled={pending}>
          Delete
        </button>
      </div>

      {confirming && (
        <Modal title="Delete this post?" description="This removes it and cancels any queued email reminder." onClose={() => setConfirming(false)}>
          <p className="rounded-lg bg-muted-bg p-3 text-sm">{post.title}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" data-autofocus className="btn btn-ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </article>
  );
}
