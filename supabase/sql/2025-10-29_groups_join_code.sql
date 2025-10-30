-- Adds a unique join_code, richer metadata to study_groups, a helper view to show admin name + member count,
-- and a video_rooms table with policies so only the admin can start a room.
-- Run in Supabase SQL editor.

-- 1) Columns on groups
alter table public.study_groups
  add column if not exists join_code text unique,
  add column if not exists description text,
  add column if not exists max_members int,
  add column if not exists is_public boolean default true,
  add column if not exists tags text[];

-- Backfill any existing rows with a code if missing
create or replace function public._gen_join_code(len int default 6)
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  if len < 4 then len := 4; end if;
  for i in 1..len loop
    out := out || substr(chars, floor(random()*length(chars))::int + 1, 1);
  end loop;
  return out;
end $$;

update public.study_groups
set join_code = public._gen_join_code()
where join_code is null;

-- 2) Helper view with admin name and member count (used by UI)
drop view if exists public.study_groups_view;
create view public.study_groups_view as
select
  g.*,
  p.full_name as admin_name,
  (select count(*)::int from public.group_members gm where gm.group_id = g.id) as member_count
from public.study_groups g
left join public.profiles p on p.id = g.created_by;

-- 3) Video rooms (admin can start only)
create table if not exists public.video_rooms (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  started_by uuid not null references public.profiles(id) on delete cascade,
  active boolean default true,
  started_at timestamptz default now()
);

alter table public.video_rooms enable row level security;

-- Read: group members can see active rooms
create policy if not exists video_rooms_read on public.video_rooms
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = video_rooms.group_id and gm.user_id = auth.uid()
    )
  );

-- Insert: only admin of the group may start
create policy if not exists video_rooms_insert on public.video_rooms
  for insert with check (
    exists (
      select 1 from public.study_groups g
      where g.id = group_id and g.created_by = auth.uid()
    )
  );

-- Update (close room): only admin
create policy if not exists video_rooms_update on public.video_rooms
  for update using (
    exists (
      select 1 from public.study_groups g
      where g.id = group_id and g.created_by = auth.uid()
    )
  );

-- 4) (Optional) If you want DB-level join-by-code, create an RPC to verify code:
create or replace function public.join_group_with_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  g_id uuid;
begin
  select id into g_id from public.study_groups where upper(join_code) = upper(p_code) limit 1;
  if g_id is null then
    raise exception 'Invalid or unknown group code';
  end if;
  insert into public.group_members(group_id, user_id)
  values (g_id, auth.uid())
  on conflict do nothing;
  return g_id;
end $$;

revoke all on function public.join_group_with_code(text) from public;
grant execute on function public.join_group_with_code(text) to authenticated;
