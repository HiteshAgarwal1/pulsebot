-- Fix: RLS infinite recursion on profiles table
-- The admin policies query profiles to check role, which triggers RLS again.
-- Solution: use a SECURITY DEFINER function that bypasses RLS.

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Drop the recursive policies
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "Admins can view all configs" on public.user_configs;
drop policy if exists "Admins can view all delivery logs" on public.delivery_logs;

-- Recreate using the security definer function (no recursion)
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

create policy "Admins can view all configs"
  on public.user_configs for select
  using (public.is_admin());

create policy "Admins can view all delivery logs"
  on public.delivery_logs for select
  using (public.is_admin());

-- Fix: Make slack_webhook_url nullable so topics-only upsert works
-- Users configure webhook in settings, topics are saved separately
alter table public.user_configs
  alter column slack_webhook_url drop not null,
  alter column slack_webhook_url set default '';
