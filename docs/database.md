# Database Documentation

## Overview

PostgreSQL schema for the PhotoShare platform, managed via Supabase. The database stores application metadata — photo binary files are stored in Supabase Storage, not in the database.

**Migration files:**
- `supabase/migrations/20240101000000_initial_schema.sql` — Full schema, RLS, Storage, functions, triggers
- `supabase/migrations/20240102000000_gallery_event_unique.sql` — One gallery per event constraint

---

## Enums

| Enum | Values | Usage |
|------|--------|-------|
| `user_role` | `ADMIN`, `TEAM_MEMBER` | User roles in profiles table |
| `gallery_status` | `DRAFT`, `PUBLISHED` | Gallery lifecycle status |

---

## Tables

### `profiles`

Application user profiles, linked to Supabase Auth users. Created automatically on signup via database trigger.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NOT NULL | — | PK, references `auth.users(id)` ON DELETE CASCADE |
| `full_name` | text | NOT NULL | `''` | Display name |
| `role` | user_role | NOT NULL | `'TEAM_MEMBER'` | `ADMIN` or `TEAM_MEMBER` |
| `created_at` | timestamptz | NOT NULL | `now()` | |
| `updated_at` | timestamptz | NOT NULL | `now()` | Auto-updated via trigger |

**RLS Policies:**
- Users can view own profile
- Admins can view all profiles (for team management)
- Users can update own `full_name` (role is not user-modifiable)

**Indexes:**
- `idx_profiles_role` on `role`

---

### `events`

Photography events created by Admin users.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | PK |
| `name` | text | NOT NULL | — | Event name |
| `description` | text | NOT NULL | `''` | Event description |
| `event_date` | date | YES | — | Optional event date |
| `created_by` | uuid | NOT NULL | — | FK → `profiles(id)` ON DELETE RESTRICT |
| `created_at` | timestamptz | NOT NULL | `now()` | |
| `updated_at` | timestamptz | NOT NULL | `now()` | Auto-updated via trigger |

**RLS Policies:**
- Admins can create events
- Admins can view/update/delete own events (`created_by` check)
- Team Members can view assigned events (via `event_members` join)

**Indexes:**
- `idx_events_created_by` on `created_by`
- `idx_events_event_date` on `event_date`

---

### `event_members`

Join table mapping team members to events they are assigned to.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | PK |
| `event_id` | uuid | NOT NULL | — | FK → `events(id)` ON DELETE CASCADE |
| `user_id` | uuid | NOT NULL | — | FK → `profiles(id)` ON DELETE CASCADE |
| `assigned_at` | timestamptz | NOT NULL | `now()` | |
| | | | | UNIQUE constraint on `(event_id, user_id)` |

**RLS Policies:**
- Admins can add/view/delete members for own events
- Team Members can view own assignments

**Indexes:**
- `idx_event_members_event_id` on `event_id`
- `idx_event_members_user_id` on `user_id`

---

### `photos`

Photo metadata. Actual image files are stored in Supabase Storage (`event-photos` bucket). The database never stores binary photo data.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | PK |
| `event_id` | uuid | NOT NULL | — | FK → `events(id)` ON DELETE CASCADE |
| `uploaded_by` | uuid | NOT NULL | — | FK → `profiles(id)` ON DELETE RESTRICT |
| `filename` | text | NOT NULL | — | Original filename |
| `storage_path` | text | NOT NULL | — | Path in `event-photos` bucket |
| `file_size` | bigint | NOT NULL | — | File size in bytes |
| `mime_type` | text | NOT NULL | — | e.g., `image/jpeg` |
| `is_selected` | boolean | NOT NULL | `false` | Admin selection flag for gallery inclusion |
| `created_at` | timestamptz | NOT NULL | `now()` | |
| `updated_at` | timestamptz | NOT NULL | `now()` | Auto-updated via trigger |

**RLS Policies:**
- Team Members can insert photos to assigned events (membership verified)
- Team Members can view own uploaded photos
- Admins can view/update/delete photos for own events

**Indexes:**
- `idx_photos_event_id` on `event_id`
- `idx_photos_uploaded_by` on `uploaded_by`
- `idx_photos_is_selected` on `is_selected` WHERE `is_selected = true` (partial index)

---

### `galleries`

Customer-facing published galleries. One gallery per event (enforced via unique constraint).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | PK |
| `event_id` | uuid | NOT NULL | — | FK → `events(id)` ON DELETE CASCADE, UNIQUE |
| `name` | text | NOT NULL | — | Gallery display name |
| `slug` | text | NOT NULL | — | Unique public URL identifier |
| `status` | gallery_status | NOT NULL | `'DRAFT'` | `DRAFT` or `PUBLISHED` |
| `pin_hash` | text | YES | — | bcrypt hash of 6-digit PIN (never plaintext) |
| `published_at` | timestamptz | YES | — | Set when status changes to `PUBLISHED` |
| `created_by` | uuid | NOT NULL | — | FK → `profiles(id)` ON DELETE RESTRICT |
| `created_at` | timestamptz | NOT NULL | `now()` | |
| `updated_at` | timestamptz | NOT NULL | `now()` | Auto-updated via trigger |

**RLS Policies:**
- Admins can create/view/update/delete own galleries
- Team Members: no access to galleries table

**Indexes:**
- `idx_galleries_event_id` on `event_id`
- `idx_galleries_slug` on `slug`
- `idx_galleries_status` on `status`

---

### `gallery_photos`

Join table mapping selected photos into galleries.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | PK |
| `gallery_id` | uuid | NOT NULL | — | FK → `galleries(id)` ON DELETE CASCADE |
| `photo_id` | uuid | NOT NULL | — | FK → `photos(id)` ON DELETE CASCADE |
| `added_at` | timestamptz | NOT NULL | `now()` | |
| | | | | UNIQUE constraint on `(gallery_id, photo_id)` |

**RLS Policies:**
- Admins can add/view/delete gallery photos for own galleries
- Team Members: no access

**Indexes:**
- `idx_gallery_photos_gallery_id` on `gallery_id`
- `idx_gallery_photos_photo_id` on `photo_id`

---

## Relationships

```
auth.users
    |
    +-- profiles (1:1 via FK)

profiles
    |
    +-- events.created_by (1:N)
    |       |
    |       +-- event_members.event_id (N:N via join table)
    |       |       |
    |       |       +-- profiles.user_id (assigned team members)
    |       |
    |       +-- photos.event_id (1:N)
    |       |       |
    |       |       +-- gallery_photos.photo_id (N:N via join table)
    |       |
    |       +-- galleries.event_id (1:1, unique constraint)
    |               |
    |               +-- gallery_photos.gallery_id (1:N)
    |
    +-- event_members.user_id (1:N, participation)
    +-- photos.uploaded_by (1:N, uploads)
    +-- galleries.created_by (1:N, ownership)
```

---

## Database Functions

| Function | Language | Purpose |
|----------|----------|---------|
| `handle_new_user()` | PL/pgSQL | Trigger on `auth.users` INSERT — creates `profiles` row with user metadata |
| `update_updated_at()` | PL/pgSQL | Trigger on UPDATE — auto-sets `updated_at` to `now()` |
| `get_user_role()` | SQL | Returns current user's role for RLS policy evaluation |

### Trigger: `on_auth_user_created`

Fires after insert on `auth.users`. Creates a `profiles` row with:
- `id` = `auth.users.id`
- `full_name` = from `raw_user_meta_data ->> 'full_name'`
- `role` = from `raw_user_meta_data ->> 'role'` (defaults to `TEAM_MEMBER`)

### Trigger: `*_updated_at`

Fires before update on `profiles`, `events`, `photos`, `galleries`. Sets `updated_at = now()`.

---

## Storage Model

### Separation of Binary and Metadata

```
Photo Upload
    |
    +-- Binary data --> Supabase Storage (event-photos bucket)
    |                   Path: {event_id}/{timestamp}_{index}.{ext}
    |                   Private bucket, signed URLs for access
    |
    +-- Metadata ------> PostgreSQL (photos table)
                        Stores: id, event_id, uploaded_by, filename,
                                storage_path, file_size, mime_type
```

**Why separate?**
- Large binary data bloats database backups
- Object storage is cheaper and scales better for files
- CDN delivery and image transformation features
- Separation of concerns (metadata vs. binary assets)

### Storage Bucket: `event-photos`

| Property | Value |
|----------|-------|
| Name | `event-photos` |
| Public | `false` (private) |
| Path convention | `{event_id}/{filename}` |

**Storage Policies:**
- Team Members: INSERT (upload) to bucket
- Authenticated users: SELECT (read) from bucket
- Admins: DELETE from bucket

---

## Row-Level Security (RLS)

All 6 tables have RLS enabled with a total of 27 policies.

### RLS Strategy by Table

| Table | Policy Summary |
|-------|---------------|
| `profiles` | Users read own; Admins read all; Users update own `full_name` only |
| `events` | Admins CRUD own; Team Members read assigned only |
| `event_members` | Admins manage for own events; Team Members view own assignments |
| `photos` | Team Members insert to assigned events, read own; Admins manage for own events |
| `galleries` | Admins CRUD own; Team Members: no access |
| `gallery_photos` | Admins manage for own galleries; Team Members: no access |

### Defense in Depth

RLS acts as a **second authorization boundary** alongside server-side checks:

1. **Server-side** — `requireAdmin()`, `requireTeamMember()`, event ownership checks
2. **Database-level** — RLS policies enforce the same rules at the query level

This means even if a server-side check were bypassed, the database would still reject unauthorized queries.

---

## Indexes Summary

| Table | Index | Column(s) | Notes |
|-------|-------|-----------|-------|
| `profiles` | `idx_profiles_role` | `role` | Fast role lookups |
| `events` | `idx_events_created_by` | `created_by` | Admin event queries |
| `events` | `idx_events_event_date` | `event_date` | Date-based queries |
| `event_members` | `idx_event_members_event_id` | `event_id` | Event membership lookups |
| `event_members` | `idx_event_members_user_id` | `user_id` | User assignment lookups |
| `photos` | `idx_photos_event_id` | `event_id` | Event photo queries |
| `photos` | `idx_photos_uploaded_by` | `uploaded_by` | Uploader queries |
| `photos` | `idx_photos_is_selected` | `is_selected` | Partial index (selected only) |
| `galleries` | `idx_galleries_event_id` | `event_id` | Event gallery lookups |
| `galleries` | `idx_galleries_slug` | `slug` | Public URL lookups |
| `galleries` | `idx_galleries_status` | `status` | Status-based queries |
| `gallery_photos` | `idx_gallery_photos_gallery_id` | `gallery_id` | Gallery photo queries |
| `gallery_photos` | `idx_gallery_photos_photo_id` | `photo_id` | Photo gallery lookups |

---

## Unique Constraints

| Table | Columns | Purpose |
|-------|---------|---------|
| `event_members` | `(event_id, user_id)` | Prevent duplicate assignments |
| `galleries` | `event_id` | One gallery per event |
| `galleries` | `slug` | Unique public URL identifiers |
| `gallery_photos` | `(gallery_id, photo_id)` | Prevent duplicate photo inclusion |
