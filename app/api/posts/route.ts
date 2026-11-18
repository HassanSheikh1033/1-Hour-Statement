import { withAuth, parseBody, json, errorJson, loadSettings } from "@/lib/api";
import { insertPost, listPosts, setEmailId } from "@/lib/db";
import { notifyForPost } from "@/lib/email";
import { postInputSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

export const GET = withAuth(async (_req, ctx) => {
  const posts = await listPosts(ctx.email);
  return json({ posts, syncedAt: new Date().toISOString() });
});

export const POST = withAuth(async (req, ctx) => {
  const input = await parseBody(req, postInputSchema);
  if (new Date(input.scheduledAt).getTime() <= Date.now()) {
    return errorJson("Scheduled time must be in the future", 400);
  }
  const post = await insertPost(ctx.email, input);

  // Emails never block saving: failures come back as warnings.
  const settings = await loadSettings(ctx);
  const outcome = await notifyForPost(post, settings, ctx.email, { confirmation: true });
  let saved = post;
  if (outcome.emailId) {
    await setEmailId(ctx.email, post.id, outcome.emailId);
    saved = { ...post, emailId: outcome.emailId };
  }
  return json({ post: saved, warnings: outcome.warnings }, 201);
});
