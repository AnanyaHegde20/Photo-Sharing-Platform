# Architecture

## System Overview

PhotoShare is a full-stack web application built with Next.js 16 (App Router) and Supabase. The architecture separates concerns between the application layer (Next.js), the data layer (PostgreSQL), the authentication layer (Supabase Auth), and the file storage layer (Supabase Storage).

```
                    +-----------------------+
                    |        Browser        |
                    +-----------+-----------+
                                |
                                v
                    +-----------------------+
                    |       Next.js         |
                    |  React Server Comps   |
                    |   Server Actions      |
                    |      Middleware        |
                    +-----------+-----------+
                                |
              +-----------------+-----------------+
              v                 v                 v
    +----------------+  +----------------+  +----------------+
    |  Supabase Auth |  |   PostgreSQL   |  | Supabase       |
    |                |  |                |  | Storage        |
    | - Sessions     |  | - profiles     |  |                |
    | - JWT tokens   |  | - events       |  | - event-photos |
    | - User mgmt    |  | - event_members|  |   bucket       |
    |                |  | - photos       |  | - Private      |
    |                |  | - galleries    |  | - Signed URLs  |
    |                |  | - gallery_photos| |                |
    +----------------+  +----------------+  +----------------+
```

## Components

### Next.js (Application Layer)

**Responsibilities:**
- UI rendering (React Server Components + Client Components)
- Routing via App Router
- Server Actions for data mutations
- Middleware for session refresh and route protection
- Authentication-aware layout rendering

**Key files:**
- `src/middleware.ts` — Route protection, session refresh
- `src/app/layout.tsx` — Root layout with fonts and metadata
- `src/app/page.tsx` — Landing page
- `src/lib/actions/` — All server actions
- `src/lib/auth.ts` — Auth helper functions
- `src/lib/supabase/middleware.ts` — Supabase session management in middleware

### Supabase Auth (Authentication Layer)

**Responsibilities:**
- User registration and login (email/password)
- Session management via JWT tokens
- Server-side session validation via `supabase.auth.getUser()`
- User metadata storage (full_name, role)

**Session flow:**
1. User submits credentials to Server Action
2. Server Action calls `supabase.auth.signInWithPassword()`
3. Supabase returns JWT session token
4. Middleware refreshes session on every request
5. Server components read session via `supabase.auth.getUser()`

### PostgreSQL (Data Layer)

**Responsibilities:**
- Store all application data (profiles, events, photos, galleries)
- Enforce data integrity via foreign keys and constraints
- Enforce access control via Row Level Security (RLS)
- Auto-generate timestamps via triggers
- Auto-create profiles on user signup via trigger

**Key design decisions:**
- Photo binary data is NOT stored in the database
- Gallery PINs are stored as bcrypt hashes, never plaintext
- One gallery per event (enforced via unique constraint)
- RLS policies act as a second authorization boundary alongside server-side checks

### Supabase Storage (File Layer)

**Responsibilities:**
- Store actual photo files (JPEG, PNG, WebP, HEIC, HEIF)
- Private bucket — no public access
- Generate signed URLs with configurable expiry
- Enforce upload permissions via storage policies

**Storage path convention:**
```
event-photos/
  {event_id}/
    {timestamp}_{index}.{ext}
```

**Signed URL expiry:**
- Customer access: 15 minutes
- Admin/Team access: 1 hour

## Data Flow

### Admin — Create Event

```
1. Admin fills event form (name, description, date)
2. Client calls createEvent() Server Action
3. Server Action calls requireAdmin() — verifies auth + role
4. Server Action validates input (event name, description, date)
5. Server Action inserts into events table
6. revalidatePath("/admin/events") triggers UI refresh
7. Event appears in Admin dashboard
```

### Team Member — Upload Photos

```
1. Team Member opens assigned event detail page
2. Team Member selects files via PhotoUpload component
3. Client-side validation: file type, size (10MB max), count (20 max)
4. Client calls uploadPhotos() Server Action
5. Server Action calls requireTeamMember() — verifies auth + role
6. Server Action verifies event membership (event_members table)
7. Files uploaded to Supabase Storage (event-photos bucket)
8. Photo metadata inserted into photos table
9. revalidatePath triggers UI refresh
10. Photos appear in event detail page
```

### Admin — Curate Photos

```
1. Admin opens event detail page with photo grid
2. Admin uses filters/search to find photos
3. Admin toggles photo selection (individual or bulk)
4. Client calls setPhotosSelected() Server Action
5. Server Action verifies Admin owns the event
6. photos.is_selected updated in database
7. UI reflects selection state
```

### Admin — Publish Gallery

```
1. Admin opens Gallery Manager for event
2. Admin reviews selected photos
3. Admin configures gallery (name, PIN)
4. PIN hashed with bcrypt (12 rounds)
5. Gallery status set to PUBLISHED
6. published_at timestamp set
7. Gallery URL + PIN ready to share
```

### Customer — Access Gallery

```
1. Customer opens gallery URL (/gallery/{slug})
2. Gallery page checks for existing access cookie
3. No cookie → PIN entry form displayed
4. Customer enters 6-digit PIN
5. Server Action verifies PIN via bcrypt.compare()
6. On success: HMAC-signed HttpOnly cookie set
7. Cookie path-scoped to /gallery/{slug}
8. Gallery page re-renders with authorized state
9. Signed Storage URLs generated (15-min expiry)
10. Customer views photos
11. Cookie expires after 2 hours
```

## Authentication Architecture

### Session Management

```
Browser                          Server (Next.js)
   |                                  |
   |-- Login form submit -----------> |
   |                                  |-- supabase.auth.signInWithPassword()
   |                                  |<-- JWT session token
   |<-- Set-Cookie (sb-*) ----------- |
   |                                  |
   |-- Subsequent request ----------> |
   |   (Cookie: sb-*)                |-- middleware.ts: updateSession()
   |                                  |   supabase.auth.getUser()
   |<-- Response ------------------- |   (session refreshed if valid)
```

### Role-Based Route Protection

```
middleware.ts
    |
    +-- Public paths: /, /login, /register, /customer
    |   (accessible without auth)
    |
    +-- Gallery paths: /gallery/*
    |   (accessible without auth, PIN-protected at app level)
    |
    +-- Admin paths: /admin/*
    |   (requires ADMIN role)
    |
    +-- Team paths: /team/*
        (requires TEAM_MEMBER role)
```

### Authorization Layers

The application uses defense-in-depth authorization:

1. **Middleware** — Route-level role enforcement
2. **Server Action checks** — `requireAdmin()`, `requireTeamMember()`
3. **Business logic checks** — Event ownership, team membership
4. **RLS policies** — Database-level access control

```
Request
    |
    v
[Layer 1] Middleware — Is user authenticated? Is role correct for path?
    |
    v
[Layer 2] Server Action — requireAdmin()/requireTeamMember()
    |
    v
[Layer 3] Business Logic — Does user own this event? Is user a member?
    |
    v
[Layer 4] RLS — Does database policy allow this operation?
    |
    v
Response
```

## Security Architecture

### Gallery Access Cookie

```
Payload: { galleryId, slug, token, expiresAt }
    |
    v
JSON.stringify(payload)
    |
    v
HMAC-SHA256 signature (using GALLERY_COOKIE_SECRET)
    |
    v
{ payload, signature } → JSON → Base64URL encode
    |
    v
Set-Cookie: gallery_access=<encoded>
    HttpOnly=true
    Secure=true (production)
    SameSite=Lax
    Path=/gallery/{slug}
    MaxAge=7200 (2 hours)
```

### PIN Verification Flow

```
Customer submits 6-digit PIN
    |
    v
Rate limit check (5 attempts / 15 min / slug)
    |
    v
Gallery lookup by slug
    |
    v
Status check (must be PUBLISHED)
    |
    v
PIN hash exists check
    |
    v
bcrypt.compare(pin, pin_hash)
    |
    v
[Valid] → Set gallery access cookie → Return success
[Invalid] → Return error message
```

## Route Structure

```
/                                    Public landing page
/login                              Login form
/register                           Registration form
/admin                              Admin dashboard (requires ADMIN)
/admin/events                       Admin event list
/admin/events/new                   Create event
/admin/events/[eventId]             Event detail + photo review
/admin/events/[eventId]/edit        Edit event
/admin/events/[eventId]/gallery     Gallery manager
/team                               Team dashboard (requires TEAM_MEMBER)
/team/events                        Team event list
/team/events/[eventId]              Event detail + photo upload
/customer                           Customer gallery entry
/gallery/[galleryId]                Customer gallery (PIN-protected)
```

## Component Architecture

### Layout Components

- `AuthAwareHeader` — Navigation with role-based links, mobile hamburger menu
- `SiteFooter` — Footer with copyright

### Auth Components

- `LoginForm` — Email/password login form
- `RegisterForm` — Registration form with name, email, password
- `LogoutButton` — Logout trigger

### Event Components

- `EventCard` — Event summary card with actions
- `EventForm` — Create/edit event form
- `TeamMemberActions` — Add/remove team members
- `ConfirmDialog` — Confirmation dialog for destructive actions

### Photo Components

- `PhotoUpload` — Drag-and-drop upload with previews, status indicators
- `PhotoGrid` — Photo grid with selection, lightbox, bulk actions

### Gallery Components

- `PinEntry` — 6-digit segmented PIN input
- `CustomerGallery` — Customer photo grid with lightbox
- `GalleryManager` — Admin gallery configuration and publishing

### UI Components (shadcn/ui)

- `Button`, `Card`, `Dialog`, `Input`, `Badge`, etc.
- Built on Radix UI primitives
- Accessible by default
