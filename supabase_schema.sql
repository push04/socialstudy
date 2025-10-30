-- Supabase schema for SocialStudy
--
-- This script defines all of the tables, columns and row‑level
-- security policies required by the SocialStudy application. It
-- includes profiles with a study_style field, study groups,
-- membership, realtime chat with reactions, study sessions
-- (personal and group) and the policies to keep data secure.

-- Enable uuid generation if necessary
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- Profiles table
-- A profile is created for each authenticated user. The courses
-- array and study_style field are optional. A default time zone
-- should be provided by the application when creating a profile.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  -- Time zone reported by the client. Default to Asia/Kolkata for Indian users
  time_zone text default 'Asia/Kolkata',
  avatar_url text,
  courses text[],
  study_style text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
-- Allow everyone to read profiles
create policy if not exists "profiles_read" on public.profiles
  for select using (true);
-- Allow a user to insert their own profile row
create policy if not exists "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
-- Allow a user to update their own profile
create policy if not exists "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ------------------------------------------------------------------
-- Study groups
-- Contains the group name and creator. A UUID primary key is
-- generated automatically. The created_by column is optional and
-- can be null if not set.
create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.study_groups enable row level security;
-- Anyone can read groups
create policy if not exists "groups_read" on public.study_groups
  for select using (true);
-- Any logged in user can create a group
create policy if not exists "groups_insert" on public.study_groups
  for insert with check (auth.uid() is not null);

-- ------------------------------------------------------------------
-- Group membership
-- Tracks which users belong to which groups. The composite primary
-- key ensures each user can only join a group once.
create table if not exists public.group_members (
  group_id uuid references public.study_groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;
-- Allow everyone to read membership lists
create policy if not exists "members_read" on public.group_members
  for select using (true);
-- Allow a user to join a group themselves
create policy if not exists "members_insert_self" on public.group_members
  for insert with check (auth.uid() = user_id);
-- Allow a user to leave a group themselves
create policy if not exists "members_delete_self" on public.group_members
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------------
-- Messages
-- Stores chat messages. Each message belongs to a group and
-- references the user who sent it.
create table if not exists public.messages (
  id bigserial primary key,
  group_id uuid references public.study_groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
-- Anyone can read messages
create policy if not exists "messages_read" on public.messages
  for select using (true);
-- Only group members can insert messages
create policy if not exists "messages_insert_member" on public.messages
  for insert with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------
-- Message reactions
-- Users can react to messages with an emoji. The primary key
-- prevents duplicate reactions per user per message.
create table if not exists public.message_reactions (
  message_id bigint references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id)
);

alter table public.message_reactions enable row level security;
-- Anyone can read reactions
create policy if not exists "reactions_read" on public.message_reactions
  for select using (true);
-- Users can insert or update their own reaction if they are group members
create policy if not exists "reactions_upsert_member" on public.message_reactions
  for insert with check (
    exists (
      select 1 from public.group_members gm
      join public.messages m on m.id = message_id and gm.group_id = m.group_id
      where gm.user_id = auth.uid()
    )
  );
create policy if not exists "reactions_update_member" on public.message_reactions
  for update using (
    exists (
      select 1 from public.group_members gm
      join public.messages m on m.id = message_id and gm.group_id = m.group_id
      where gm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------
-- Study sessions
-- Sessions can be personal (user_id set, group_id null) or group
-- based (group_id set). Title is optional. end_at may be null when
-- a session is in progress.
create table if not exists public.study_sessions (
  id bigserial primary key,
  group_id uuid references public.study_groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  start_at timestamptz not null,
  end_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists study_sessions_start_idx on public.study_sessions(start_at);

alter table public.study_sessions enable row level security;
-- Anyone can read sessions
create policy if not exists "sessions_read" on public.study_sessions
  for select using (true);
-- Users can insert a session if they are a group member or the owner
create policy if not exists "sessions_insert" on public.study_sessions
  for insert with check (
    (group_id is not null and exists (
      select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()
    ))
    or (group_id is null and user_id = auth.uid())
  );
-- Users can update their own sessions (personal or group) as members
create policy if not exists "sessions_update" on public.study_sessions
  for update using (
    (group_id is not null and exists (
      select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()
    ))
    or (group_id is null and user_id = auth.uid())
  );

-- ------------------------------------------------------------------
-- End of schema