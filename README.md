# AI Post Scheduler

Generate platform-tuned social captions with **Gemini**, schedule them in **Supabase**, and get **Resend** email reminders delivered at the exact minute.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind v4 · Auth.js v5 (Google, JWT + refresh) · `@google/genai` · `pg` (Supabase Postgres) · Resend · sonner · zod.

## How it works

- **Auth**: Google sign-in (identity only: `openid email profile`), JWT sessions. API routes read the session server-side and scope every query to the user's email.
- **Storage**: Supabase Postgres (`posts`, `settings` tables, see `supabase/schema.sql`). RLS is enabled with no policies, so the public/publishable key cannot touch the data; the server connects directly with `DATABASE_URL`.
- **Emails**: on create, an instant "Post scheduled" confirmation is sent and the reminder is queued with `resend.emails.send({ scheduledAt })` at `scheduledAt - lead`. If that moment already passed it is sent immediately. Reminders further than 30 days out only get the confirmation (a warning toast explains). Edit = cancel + re-queue; delete = cancel.
- **Cron fallback** (`/api/cron/dispatch`, daily in `vercel.json`, `Authorization: Bearer $CRON_SECRET`): queues reminders that were deferred (>30 days out) or failed once they come within range, and marks past posts `sent`.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in (below).
3. `npm run db:migrate` (creates the tables in Supabase).
4. `npm run dev` -> http://localhost:3000

Checks: `npm run typecheck`, `npm test`, `npm run build`.

### 0. Supabase
Create a project, then copy the **Session pooler** connection string (Project Settings > Database) into `DATABASE_URL`. Run `npm run db:migrate`.

### 1. Google Cloud (OAuth)
1. https://console.cloud.google.com → create a project.
2. No extra APIs are needed (sign-in only).
3. **OAuth consent screen** → External, keep it in **Testing** mode, add, and add yourself (and any judges/testers) under **Test users**. Otherwise Google blocks sign-in as an unverified app.
4. **Credentials → Create credentials → OAuth client ID → Web application**. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-app>.vercel.app/api/auth/callback/google`
5. Copy the client ID/secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
6. `AUTH_SECRET`: `npx auth secret` or `openssl rand -base64 32`.

### 2. Gemini
Create a key at https://aistudio.google.com/apikey → `GEMINI_API_KEY`. If `gemini-3.8-flash` errors, change `GEMINI_MODEL` (no code change needed).

### 3. Resend
Create a key at https://resend.com/api-keys → `RESEND_API_KEY`. Without a verified domain use `EMAIL_FROM="AI Post Scheduler <onboarding@resend.dev>"`; Resend then only delivers to **your own Resend account email**, so demo with that Google account (or set the recipient in Settings), or verify a domain to email anyone.

### Env vars
`AUTH_SECRET`, `AUTH_URL` (optional), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`. Missing/invalid values fail fast at server start with a readable list.

## Deploy to Vercel
1. Push to GitHub and import the repo at https://vercel.com/new (or run `vercel --prod`).
2. Add every env var above in **Project → Settings → Environment Variables** (`NEXT_PUBLIC_APP_URL` = `https://<your-app>.vercel.app`; set `AUTH_URL` to the same if sign-in redirects misbehave).
3. Add the production redirect URI (`https://<your-app>.vercel.app/api/auth/callback/google`) to the Google OAuth client.
4. Redeploy. The daily cron in `vercel.json` registers automatically (Hobby plans run crons once a day, which is why exact-time delivery uses Resend `scheduledAt`).

## 60-second demo script
1. (0:00) Open the app, **Sign in with Google**. Point out the "Synced with Supabase" badge.
2. (0:08) Type a topic, choose *LinkedIn* + *Professional* → **Generate**. Show 3 options and the character counter; switch to *X* to show the 280 limit.
3. (0:20) **Select & Schedule** on one. Set the time ~2 minutes ahead, reminder **At post time** → save. The instant confirmation email arrives.
4. (0:35) Show the card in the feed (Upcoming), then **Edit** the time (old email is cancelled, new one queued) and **Copy**.
5. (0:45) Open **Settings**: change subject template, lead time, signature → **Send test email**.
6. (0:52) Open the Supabase table editor to show the `posts` row. At about 2 minutes the scheduled reminder lands.
