create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  title text not null,
  caption text not null,
  hashtags text[] not null default '{}',
  platform text not null check (platform in ('Instagram','LinkedIn','X','Facebook','TikTok')),
  scheduled_at timestamptz not null,
  notes text not null default '',
  status text not null default 'scheduled' check (status in ('scheduled','sent','draft')),
  notify_enabled boolean not null default true,
  lead_minutes integer not null default 15,
  email_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_user_scheduled_idx on public.posts (user_email, scheduled_at);
create index if not exists posts_status_idx on public.posts (status, scheduled_at);

create table if not exists public.settings (
  user_email text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- The app talks to Postgres only from the server. RLS with no policies blocks the public
-- (publishable/anon) key from reading or writing these tables.
alter table public.posts enable row level security;
alter table public.settings enable row level security;
