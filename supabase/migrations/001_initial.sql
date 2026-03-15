-- Pulsebot Database Schema

-- Profiles (extends Supabase Auth users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User configurations (one per user)
create table public.user_configs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique,
  slack_webhook_url text not null,
  channel_name text default '#ai-news',
  delivery_time time default '09:00',
  timezone text default 'Asia/Kolkata',
  top_n integer default 10,
  topics text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Article cache (dedup + history)
create table public.articles (
  id uuid default gen_random_uuid() primary key,
  url text unique not null,
  title text not null,
  source text,
  published_at timestamptz,
  summary text,
  why_it_matters text,
  categories text[],
  score float,
  fetched_at timestamptz default now()
);

-- Delivery logs
create table public.delivery_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  delivered_at timestamptz default now(),
  article_count integer,
  status text check (status in ('success', 'failed', 'retrying')),
  error_message text,
  digest_snapshot jsonb
);

-- Daily digests (shared across users)
create table public.daily_digests (
  id uuid default gen_random_uuid() primary key,
  digest_date date unique not null,
  tldr text,
  articles jsonb not null,
  categories_covered text[],
  created_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case
      when new.email = coalesce(current_setting('app.admin_email', true), '') then 'admin'
      when not exists (select 1 from public.profiles limit 1) then 'admin'
      else 'user'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger user_configs_updated_at
  before update on public.user_configs
  for each row execute procedure public.update_updated_at();

-- Indexes
create index idx_articles_published_at on public.articles(published_at);
create index idx_articles_fetched_at on public.articles(fetched_at);
create index idx_delivery_logs_user_id on public.delivery_logs(user_id);
create index idx_delivery_logs_delivered_at on public.delivery_logs(delivered_at);
create index idx_daily_digests_date on public.daily_digests(digest_date);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.user_configs enable row level security;
alter table public.articles enable row level security;
alter table public.delivery_logs enable row level security;
alter table public.daily_digests enable row level security;

-- Profiles: users can read/update their own, admins can read all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- User Configs: users can CRUD their own, admins can read all
create policy "Users can view own config"
  on public.user_configs for select
  using (auth.uid() = user_id);

create policy "Users can insert own config"
  on public.user_configs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own config"
  on public.user_configs for update
  using (auth.uid() = user_id);

create policy "Users can delete own config"
  on public.user_configs for delete
  using (auth.uid() = user_id);

create policy "Admins can view all configs"
  on public.user_configs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Articles: readable by all authenticated users
create policy "Authenticated users can view articles"
  on public.articles for select
  using (auth.role() = 'authenticated');

-- Delivery Logs: users can view their own, admins can view all
create policy "Users can view own delivery logs"
  on public.delivery_logs for select
  using (auth.uid() = user_id);

create policy "Admins can view all delivery logs"
  on public.delivery_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Daily Digests: readable by all authenticated users
create policy "Authenticated users can view digests"
  on public.daily_digests for select
  using (auth.role() = 'authenticated');

-- Cleanup: auto-delete articles older than 7 days (run via pg_cron or app scheduler)
-- select cron.schedule('cleanup-old-articles', '0 2 * * *', $$
--   delete from public.articles where fetched_at < now() - interval '7 days';
-- $$);
