-- Add unique_key column to study_groups table
-- This allows groups to be joined via a shareable unique code

alter table public.study_groups
  add column if not exists unique_key text unique;

-- Backfill unique_key for existing rows
update public.study_groups
   set unique_key = coalesce(unique_key, encode(gen_random_bytes(8), 'hex'))
 where unique_key is null;

-- Add index for faster lookups
create index if not exists idx_groups_unique_key on public.study_groups(unique_key);

-- Add helpful index for group members
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_user_id on public.group_members(user_id);

-- Add index for messages
create index if not exists idx_messages_group_id on public.messages(group_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);

-- Ensure profile auto-create function exists (prevents FK violations)
-- This trigger creates a profile row when a new user signs up

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists and recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Add comment for documentation
comment on column public.study_groups.unique_key is 'Shareable unique code for joining the group (e.g., "a3f8b2c1")';
