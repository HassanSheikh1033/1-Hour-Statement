import { withAuth, parseBody, json, errorJson, loadSettings } from "@/lib/api";
import { deletePost, getPost, savePost, setEmailId } from "@/lib/db";
import { cancelEmail, notifyForPost, errMsg } from "@/lib/email";
import { postPatchSchema, type Post } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

type Params = { id: string };

export const PATCH = withAuth<Params>(async (req, ctx, { id }) => {
  const patch = await parseBody(req, postPatchSchema);
  const existing = await getPost(ctx.email, id);
  if (!existing) return errorJson("Post not found", 404);

  const timeChanged = patch.scheduledAt !== undefined && patch.scheduledAt !== existing.scheduledAt;
  if (patch.scheduledAt !== undefined && timeChanged && new Date(patch.scheduledAt).getTime() <= Date.now()) {
    return errorJson("Scheduled time must be in the future", 400);
  }

  const warnings: string[] = [];
  if (existing.emailId) {
    try {
      await cancelEmail(existing.emailId);
    } catch (err) {
      warnings.push(`Couldn't cancel the previous reminder: ${errMsg(err)}`);
    }
  }

  const merged: Post = {
    ...existing,
    ...patch,
    id: existing.id,
    emailId: undefined,
    status: new Date(patch.scheduledAt ?? existing.scheduledAt).getTime() > Date.now() ? "scheduled" : existing.status,
  };
  const saved = await savePost(ctx.email, merged);
  if (!saved) return errorJson("Post not found", 404);

  const settings = await loadSettings(ctx);
  const outcome = await notifyForPost(saved, settings, ctx.email, { confirmation: false });
  warnings.push(...outcome.warnings);
  let result = saved;
  if (outcome.emailId) {
    await setEmailId(ctx.email, id, outcome.emailId);
    result = { ...saved, emailId: outcome.emailId };
  }
  return json({ post: result, warnings });
});

export const DELETE = withAuth<Params>(async (_req, ctx, { id }) => {
  const removed = await deletePost(ctx.email, id);
  if (!removed) return errorJson("Post not found", 404);
  const warnings: string[] = [];
  if (removed.emailId) {
    try {
      await cancelEmail(removed.emailId);
    } catch (err) {
      warnings.push(`Post deleted, but the queued reminder couldn't be cancelled: ${errMsg(err)}`);
    }
  }
  return json({ ok: true, warnings });
});
