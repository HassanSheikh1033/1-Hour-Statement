import { z } from "zod";

const envSchema = z.object({
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required (generate with `npx auth secret`)"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID is required (Google Cloud OAuth client ID)"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET is required (Google Cloud OAuth client secret)"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required (https://aistudio.google.com/apikey)"),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.8-flash"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Supabase Postgres connection string)"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required (https://resend.com/api-keys)"),
  EMAIL_FROM: z.string().min(3, "EMAIL_FROM is required, e.g. 'App <onboarding@resend.dev>'"),
  CRON_SECRET: z.string().min(8, "CRON_SECRET is required (at least 8 characters)"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a full URL, e.g. https://my-app.vercel.app"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validates process.env once and throws one readable error listing every problem. */
export function getEnv(): Env {
  if (cached) return cached;
  const raw: Record<string, string | undefined> = {};
  for (const key of Object.keys(envSchema.shape)) {
    const v = process.env[key];
    raw[key] = v?.trim() ? v.trim() : key === "GEMINI_MODEL" ? undefined : "";
  }
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(
      `Invalid environment configuration:\n${lines.join("\n")}\nSee .env.example and README.md.`,
    );
  }
  cached = parsed.data;
  return cached;
}
