create table if not exists public.avatar_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

grant select on public.avatar_credits to authenticated;
grant all on public.avatar_credits to service_role;

alter table public.avatar_credits enable row level security;

drop policy if exists "Users can read own avatar credits" on public.avatar_credits;
create policy "Users can read own avatar credits"
  on public.avatar_credits for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('avatar', 'tryon')),
  used_credit boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_kind_created_idx
  on public.ai_usage_events (user_id, kind, created_at desc);

grant select, insert on public.ai_usage_events to authenticated;
grant all on public.ai_usage_events to service_role;

alter table public.ai_usage_events enable row level security;

drop policy if exists "Users can read own ai usage" on public.ai_usage_events;
create policy "Users can read own ai usage"
  on public.ai_usage_events for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own ai usage" on public.ai_usage_events;
create policy "Users can insert own ai usage"
  on public.ai_usage_events for insert
  to authenticated
  with check (auth.uid() = user_id);

alter table public.payment_sessions
  add column if not exists product text not null default 'premium';