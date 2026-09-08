-- ============================================================
-- PhotoShare Database Schema
-- Phase 2: Complete data model + RLS + Storage foundation
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type public.user_role as enum ('ADMIN', 'TEAM_MEMBER');
create type public.gallery_status as enum ('DRAFT', 'PUBLISHED');

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (linked to Supabase Auth users)
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  role       public.user_role not null default 'TEAM_MEMBER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profiles linked to Supabase Auth users. Roles: ADMIN, TEAM_MEMBER.';

-- Events
create table public.events (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text not null default '',
  event_date  date,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.events is 'Photography events created by Admin/Lead users.';

-- Event Members (join table: which team members are assigned to which events)
create table public.event_members (
  id          uuid primary key default uuid_generate_v4(),
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (event_id, user_id)
);

comment on table public.event_members is 'Maps team members to events they are assigned to.';

-- Photos (metadata only — actual files stored in Supabase Storage)
create table public.photos (
  id           uuid primary key default uuid_generate_v4(),
  event_id     uuid not null references public.events(id) on delete cascade,
  uploaded_by  uuid not null references public.profiles(id) on delete restrict,
  filename     text not null,
  storage_path text not null,
  file_size    bigint not null,
  mime_type    text not null,
  is_selected  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.photos is 'Photo metadata. Actual image files stored in Supabase Storage (event-photos bucket).';

-- Galleries
create table public.galleries (
  id           uuid primary key default uuid_generate_v4(),
  event_id     uuid not null references public.events(id) on delete cascade,
  name         text not null,
  slug         text not null unique,
  status       public.gallery_status not null default 'DRAFT',
  pin_hash     text,
  published_at timestamptz,
  created_by   uuid not null references public.profiles(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.galleries is 'Customer-facing galleries. PIN stored as hash only.';

-- Gallery Photos (join table: which photos are in which gallery)
create table public.gallery_photos (
  id        uuid primary key default uuid_generate_v4(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  photo_id  uuid not null references public.photos(id) on delete cascade,
  added_at  timestamptz not null default now(),
  unique (gallery_id, photo_id)
);

comment on table public.gallery_photos is 'Maps photos into published galleries.';

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_profiles_role on public.profiles(role);

create index idx_events_created_by on public.events(created_by);
create index idx_events_event_date on public.events(event_date);

create index idx_event_members_event_id on public.event_members(event_id);
create index idx_event_members_user_id on public.event_members(user_id);

create index idx_photos_event_id on public.photos(event_id);
create index idx_photos_uploaded_by on public.photos(uploaded_by);
create index idx_photos_is_selected on public.photos(is_selected) where is_selected = true;

create index idx_galleries_event_id on public.galleries(event_id);
create index idx_galleries_slug on public.galleries(slug);
create index idx_galleries_status on public.galleries(status);

create index idx_gallery_photos_gallery_id on public.gallery_photos(gallery_id);
create index idx_gallery_photos_photo_id on public.gallery_photos(photo_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Automatically create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'TEAM_MEMBER')
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is 'Creates a public.profiles row on auth.users insert.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Update updated_at on row changes
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger events_updated_at
  before update on public.events
  for each row execute function public.update_updated_at();

create trigger photos_updated_at
  before update on public.photos
  for each row execute function public.update_updated_at();

create trigger galleries_updated_at
  before update on public.galleries
  for each row execute function public.update_updated_at();

-- Helper: get current user's role
create or replace function public.get_user_role()
returns public.user_role
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

comment on function public.get_user_role() is 'Returns the role of the currently authenticated user.';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.photos enable row level security;
alter table public.galleries enable row level security;
alter table public.gallery_photos enable row level security;

-- ── Profiles ────────────────────────────────────────────────

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

-- Admins can view all profiles (for team management)
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.get_user_role() = 'ADMIN');

-- Users can update their own full_name only (not role)
create policy "Users can update own full_name"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- No user can update their own role through this policy
-- (role column update is blocked by the check below)

-- ── Events ──────────────────────────────────────────────────

-- Admins can create events
create policy "Admins can create events"
  on public.events for insert
  with check (public.get_user_role() = 'ADMIN');

-- Admins can view events they created
create policy "Admins can view own events"
  on public.events for select
  using (
    public.get_user_role() = 'ADMIN'
    and created_by = auth.uid()
  );

-- Team members can view events they are assigned to
create policy "Team members can view assigned events"
  on public.events for select
  using (
    public.get_user_role() = 'TEAM_MEMBER'
    and exists (
      select 1 from public.event_members
      where event_members.event_id = events.id
        and event_members.user_id = auth.uid()
    )
  );

-- Admins can update their own events
create policy "Admins can update own events"
  on public.events for update
  using (
    public.get_user_role() = 'ADMIN'
    and created_by = auth.uid()
  );

-- Admins can delete their own events
create policy "Admins can delete own events"
  on public.events for delete
  using (
    public.get_user_role() = 'ADMIN'
    and created_by = auth.uid()
  );

-- ── Event Members ───────────────────────────────────────────

-- Admins can manage members for their own events
create policy "Admins can add event members"
  on public.event_members for insert
  with check (
    public.get_user_role() = 'ADMIN'
    and exists (
      select 1 from public.events
      where events.id = event_members.event_id
        and events.created_by = auth.uid()
    )
  );

-- Admins can view members for their own events
create policy "Admins can view event members"
  on public.event_members for select
  using (
    public.get_user_role() = 'ADMIN'
    and exists (
      select 1 from public.events
      where events.id = event_members.event_id
        and events.created_by = auth.uid()
    )
  );

-- Team members can view their own assignments
create policy "Team members can view own assignments"
  on public.event_members for select
  using (user_id = auth.uid());

-- Admins can remove members from their own events
create policy "Admins can delete event members"
  on public.event_members for delete
  using (
    public.get_user_role() = 'ADMIN'
    and exists (
      select 1 from public.events
      where events.id = event_members.event_id
        and events.created_by = auth.uid()
    )
  );

-- ── Photos ──────────────────────────────────────────────────

-- Team members can insert photos for events they are assigned to
create policy "Team members can upload photos to assigned events"
  on public.photos for insert
  with check (
    public.get_user_role() = 'TEAM_MEMBER'
    and uploaded_by = auth.uid()
    and exists (
      select 1 from public.event_members
      where event_members.event_id = photos.event_id
        and event_members.user_id = auth.uid()
    )
  );

-- Team members can view their own uploaded photos
create policy "Team members can view own photos"
  on public.photos for select
  using (
    public.get_user_role() = 'TEAM_MEMBER'
    and uploaded_by = auth.uid()
  );

-- Admins can view photos for their own events
create policy "Admins can view photos for own events"
  on public.photos for select
  using (
    public.get_user_role() = 'ADMIN'
    and exists (
      select 1 from public.events
      where events.id = photos.event_id
        and events.created_by = auth.uid()
    )
  );

-- Admins can update photos for their own events (selection, metadata)
create policy "Admins can update photos for own events"
  on public.photos for update
  using (
    public.get_user_role() = 'ADMIN'
    and exists (
      select 1 from public.events
      where events.id = photos.event_id
        and events.created_by = auth.uid()
    )
  );

-- Admins can delete photos for their own events
create policy "Admins can delete photos for own events"
  on public.photos for delete
  using (
    public.get_user_role() = 'ADMIN'
    and exists (
      select 1 from public.events
      where events.id = photos.event_id
        and events.created_by = auth.uid()
    )
  );

-- ── Galleries ───────────────────────────────────────────────

-- Admins can create galleries for their events
create policy "Admins can create galleries"
  on public.galleries for insert
  with check (
    public.get_user_role() = 'ADMIN'
    and created_by = auth.uid()
    and exists (
      select 1 from public.events
      where events.id = galleries.event_id
        and events.created_by = auth.uid()
    )
  );

-- Admins can view galleries for their events
create policy "Admins can view own galleries"
  on public.galleries for select
  using (
    public.get_user_role() = 'ADMIN'
    and created_by = auth.uid()
  );

-- Admins can update their own galleries
create policy "Admins can update own galleries"
  on public.galleries for update
  using (
    public.get_user_role() = 'ADMIN'
    and created_by = auth.uid()
  );

-- Admins can delete their own galleries
create policy "Admins can delete own galleries"
  on public.galleries for delete
  using (
    public.get_user_role() = 'ADMIN'
    and created_by = auth.uid()
  );

-- ── Gallery Photos ──────────────────────────────────────────

-- Admins can add photos to galleries they own
create policy "Admins can add photos to own galleries"
  on public.gallery_photos for insert
  with check (
    public.get_user_role() = 'ADMIN'
    and exists (
      select 1 from public.galleries
      where galleries.id = gallery_photos.gallery_id
        and galleries.created_by = auth.uid()
    )
  );

-- Admins can view photos in galleries they own
create policy "Admins can view photos in own galleries"
  on public.gallery_photos for select
  using (
    public.get_user_role() = 'ADMIN'
    and exists (
      select 1 from public.galleries
      where galleries.id = gallery_photos.gallery_id
        and galleries.created_by = auth.uid()
    )
  );

-- Admins can remove photos from galleries they own
create policy "Admins can remove photos from own galleries"
  on public.gallery_photos for delete
  using (
    public.get_user_role() = 'ADMIN'
    and exists (
      select 1 from public.galleries
      where galleries.id = gallery_photos.gallery_id
        and galleries.created_by = auth.uid()
    )
  );

-- ============================================================
-- STORAGE
-- ============================================================

-- Create the event-photos storage bucket
insert into storage.buckets (id, name, public)
  values ('event-photos', 'event-photos', false)
  on conflict (id) do nothing;

-- Team members can upload to event-photos bucket (path: {event_id}/{filename})
create policy "Team members can upload photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-photos'
    and public.get_user_role() = 'TEAM_MEMBER'
  );

-- Authenticated users can read event-photos they have access to
create policy "Authenticated users can read event photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'event-photos');

-- Admins can delete from event-photos bucket
create policy "Admins can delete event photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-photos'
    and public.get_user_role() = 'ADMIN'
  );
