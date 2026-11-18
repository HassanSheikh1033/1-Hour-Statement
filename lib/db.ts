import pg from "pg";
import { getEnv } from "./env";
import { settingsSchema, type Post, type PostInput, type Settings } from "./schemas";

const globalForPool = globalThis as unknown as { __pgPool?: pg.Pool };

function pool(): pg.Pool {
  if (!globalForPool.__pgPool) {
    globalForPool.__pgPool = new pg.Pool({
      connectionString: getEnv().DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3, // serverless-friendly
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return globalForPool.__pgPool;
}

interface PostRow {
  id: string;
  user_email: string;
  title: string;
  caption: string;
  hashtags: string[];
  platform: Post["platform"];
  scheduled_at: Date;
  notes: string;
  status: Post["status"];
  notify_enabled: boolean;
  lead_minutes: number;
  email_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function toPost(r: PostRow): Post {
  return {
    id: r.id,
    title: r.title,
    caption: r.caption,
    hashtags: r.hashtags,
    platform: r.platform,
    scheduledAt: r.scheduled_at.toISOString(),
    notes: r.notes,
    status: r.status,
    notify: { enabled: r.notify_enabled, leadMinutes: r.lead_minutes },
    ...(r.email_id ? { emailId: r.email_id } : {}),
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

/** Past scheduled posts flip to "sent", then returns all of the user's posts ordered by time. */
export async function listPosts(email: string): Promise<Post[]> {
  await pool().query(
    "update posts set status='sent', updated_at=now() where user_email=$1 and status='scheduled' and scheduled_at <= now()",
    [email],
  );
  const { rows } = await pool().query<PostRow>("select * from posts where user_email=$1 order by scheduled_at asc", [email]);
  return rows.map(toPost);
}

export async function getPost(email: string, id: string): Promise<Post | null> {
  if (!isUuid(id)) return null;
  const { rows } = await pool().query<PostRow>("select * from posts where user_email=$1 and id=$2", [email, id]);
  return rows[0] ? toPost(rows[0]) : null;
}

export async function insertPost(email: string, input: PostInput): Promise<Post> {
  const { rows } = await pool().query<PostRow>(
    `insert into posts (user_email,title,caption,hashtags,platform,scheduled_at,notes,notify_enabled,lead_minutes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
    [email, input.title, input.caption, input.hashtags, input.platform, input.scheduledAt, input.notes, input.notify.enabled, input.notify.leadMinutes],
  );
  const row = rows[0];
  if (!row) throw new Error("insert returned no row");
  return toPost(row);
}

/** Applies the merged post (clearing email_id; the caller re-queues and sets it again). */
export async function savePost(email: string, post: Post): Promise<Post | null> {
  const { rows } = await pool().query<PostRow>(
    `update posts set title=$3, caption=$4, hashtags=$5, platform=$6, scheduled_at=$7, notes=$8,
       status=$9, notify_enabled=$10, lead_minutes=$11, email_id=null, updated_at=now()
     where user_email=$1 and id=$2 returning *`,
    [email, post.id, post.title, post.caption, post.hashtags, post.platform, post.scheduledAt, post.notes, post.status, post.notify.enabled, post.notify.leadMinutes],
  );
  return rows[0] ? toPost(rows[0]) : null;
}

export async function setEmailId(email: string, id: string, emailId: string): Promise<void> {
  await pool().query("update posts set email_id=$3 where user_email=$1 and id=$2", [email, id, emailId]);
}

export async function deletePost(email: string, id: string): Promise<Post | null> {
  if (!isUuid(id)) return null;
  const { rows } = await pool().query<PostRow>("delete from posts where user_email=$1 and id=$2 returning *", [email, id]);
  return rows[0] ? toPost(rows[0]) : null;
}

export async function getSettings(email: string): Promise<Settings | null> {
  const { rows } = await pool().query<{ data: unknown }>("select data from settings where user_email=$1", [email]);
  const parsed = settingsSchema.safeParse(rows[0]?.data);
  return parsed.success ? parsed.data : null;
}

export async function saveSettings(email: string, settings: Settings): Promise<void> {
  await pool().query(
    `insert into settings (user_email,data) values ($1,$2)
     on conflict (user_email) do update set data=excluded.data, updated_at=now()`,
    [email, JSON.stringify(settings)],
  );
}

// ---- cron ----
/** Past scheduled posts across all users -> "sent". Returns the number changed. */
export async function markAllPastSent(): Promise<number> {
  const r = await pool().query("update posts set status='sent', updated_at=now() where status='scheduled' and scheduled_at <= now()");
  return r.rowCount ?? 0;
}

/** Future scheduled posts that have notifications on but no queued email. */
export async function postsNeedingReminder(): Promise<Array<{ email: string; post: Post }>> {
  const { rows } = await pool().query<PostRow>(
    "select * from posts where status='scheduled' and notify_enabled and email_id is null and scheduled_at > now()",
  );
  return rows.map((r) => ({ email: r.user_email, post: toPost(r) }));
}
