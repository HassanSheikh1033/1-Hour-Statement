import { z } from "zod";

export const PLATFORMS = ["Instagram", "LinkedIn", "X", "Facebook", "TikTok"] as const;
export const TONES = ["Casual", "Professional", "Witty", "Inspirational", "Bold"] as const;
export const LEAD_OPTIONS = [0, 15, 60, 1440] as const;

export const platformSchema = z.enum(PLATFORMS);
export const toneSchema = z.enum(TONES);
export type Platform = z.infer<typeof platformSchema>;
export type Tone = z.infer<typeof toneSchema>;

/** Hard character limits (caption + hashtags) used for counters and generation rules. */
export const PLATFORM_LIMITS: Record<Platform, number> = {
  X: 280,
  Instagram: 2200,
  LinkedIn: 3000,
  Facebook: 63206,
  TikTok: 2200,
};

export function normalizeHashtag(tag: string): string {
  return tag.trim().replace(/^#+/, "").replace(/\s+/g, "");
}

const hashtagsSchema = z
  .array(z.string())
  .max(30)
  .transform((tags) => tags.map(normalizeHashtag).filter((t) => t.length > 0));

export function fullPostText(caption: string, hashtags: string[]): string {
  const tags = hashtags.map((t) => `#${normalizeHashtag(t)}`).join(" ");
  return tags ? `${caption}\n\n${tags}` : caption;
}

// ---- Generation ----
export const generateRequestSchema = z.object({
  topic: z.string().trim().min(3, "Describe what the post is about").max(1000),
  platform: platformSchema,
  tone: toneSchema,
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const captionOptionSchema = z.object({
  caption: z.string().trim().min(1),
  hashtags: hashtagsSchema,
});
export const captionOptionsSchema = z.array(captionOptionSchema).length(3);
export type CaptionOption = z.infer<typeof captionOptionSchema>;

// ---- Posts ----
export const notifySchema = z.object({
  enabled: z.boolean(),
  leadMinutes: z.number().int().min(0).max(60 * 24 * 30),
});

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  platform: platformSchema,
  scheduledAt: z.iso.datetime(),
  notes: z.string(),
  status: z.enum(["scheduled", "sent", "draft"]),
  notify: notifySchema,
  emailId: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Post = z.infer<typeof postSchema>;
export const postsFileSchema = z.array(postSchema);

export const postInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  caption: z.string().trim().min(1, "Caption is required").max(70000),
  hashtags: hashtagsSchema,
  platform: platformSchema,
  scheduledAt: z.iso.datetime(),
  notes: z.string().max(2000).default(""),
  notify: notifySchema,
});
export type PostInput = z.infer<typeof postInputSchema>;
export const postPatchSchema = postInputSchema.partial();
export type PostPatch = z.infer<typeof postPatchSchema>;

// ---- Settings ----
export const settingsSchema = z.object({
  notificationsEnabled: z.boolean(),
  recipientEmail: z.string().trim().email("Enter a valid email").or(z.literal("")),
  defaultLeadMinutes: z.number().int().min(0).max(60 * 24 * 30),
  subjectTemplate: z.string().trim().min(1).max(200),
  includeCaption: z.boolean(),
  signature: z.string().max(500),
  timezone: z.string().min(1),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SUBJECT = "Reminder: {{title}} on {{platform}} at {{time}}";

export function defaultSettings(email: string, timezone = "UTC"): Settings {
  return {
    notificationsEnabled: true,
    recipientEmail: email,
    defaultLeadMinutes: 15,
    subjectTemplate: DEFAULT_SUBJECT,
    includeCaption: true,
    signature: "— Sent by AI Post Scheduler",
    timezone,
  };
}

export const testEmailSchema = z.object({ settings: settingsSchema.optional() });

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
