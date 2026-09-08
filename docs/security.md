# Security Audit Report

**Date:** September 7, 2026
**Scope:** Full-stack photo sharing platform (Next.js 16, Supabase, TypeScript)

---

## 1. Authentication & Authorization

### Auth Provider

Supabase Auth with `@supabase/ssr` for server-side session management.

- Sessions validated on every request via `supabase.auth.getUser()`
- Middleware refreshes sessions and enforces route-level access control
- JWT tokens stored in HttpOnly cookies managed by Supabase

### Role-Based Access Control (RBAC)

| Role | Authentication | Capabilities |
|------|---------------|-------------|
| `ADMIN` | Yes | Full event CRUD, photo review/selection, gallery management, team assignment |
| `TEAM_MEMBER` | Yes | View assigned events, upload photos to assigned events |
| Customer | No | Access published galleries via gallery link + PIN verification |

**Note:** `CUSTOMER` is not an authenticated database role. Customers access galleries via unauthenticated PIN verification.

### Authorization Enforcement

Authorization is enforced at multiple layers:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| Middleware | Route-level role check | Block unauthenticated access to `/admin/*` and `/team/*` |
| Server Actions | `requireAdmin()` / `requireTeamMember()` | Verify authenticated user has correct role |
| Business Logic | Event ownership / membership check | Verify user has access to specific resource |
| Database | Row Level Security (RLS) | Database-level access control as final boundary |

### Authorization Findings

| Check | Status | Notes |
|-------|--------|-------|
| Admin event operations verify ownership | Pass | `created_by` check on all event mutations |
| Team member upload verifies event assignment | Pass | `event_members` membership check |
| Photo delete/toggle verifies admin ownership | Pass | Event ownership verified before photo mutation |
| Gallery CRUD verifies event ownership | Pass | `verifyEventOwnership()` helper used consistently |
| Gallery publish/unpublish verifies ownership | Pass | Event ownership verified via `verifyEventOwnership()` |
| Public gallery access requires valid cookie | Pass | `verifyGalleryAccess()` checks cookie signature + expiry |
| Middleware blocks unauthenticated access | Pass | All non-public, non-gallery paths redirect to `/login` |
| Middleware enforces role-based routing | Pass | Admin/team members redirected from wrong workspace |

---

## 2. Input Validation

### Validated Inputs

| Input | Validation Rule | Location |
|-------|----------------|----------|
| Event name | Required, max 200 chars | `events.ts:createEvent`, `events.ts:updateEvent` |
| Event description | Max 2000 chars | `events.ts:createEvent`, `events.ts:updateEvent` |
| Event date | `Date.parse` validation | `events.ts:createEvent`, `events.ts:updateEvent` |
| Gallery PIN | Exactly 6 digits (`/^\d{6}$/`) | `galleries.ts:updateGalleryPin`, `gallery-access.ts:verifyGalleryPin` |
| File upload size | Max 10MB per file | `photos.ts:uploadPhotos` |
| File upload type | Whitelist: jpeg, jpg, png, webp, heic, heif | `photos.ts:uploadPhotos` |
| File upload count | Max 20 files per batch | `photos.ts:uploadPhotos` |
| UUID parameters | Format validated via regex | `src/lib/validation.ts` |
| Slug parameters | 24-char lowercase alphanumeric | `src/lib/validation.ts` |

### Validation Utilities (`src/lib/validation.ts`)

| Function | Purpose |
|----------|---------|
| `isValidUUID(value)` | UUID format check (v4 regex) |
| `isValidPin(value)` | 6-digit PIN check |
| `isValidSlug(value)` | 24-char slug check |
| `sanitizeString(value, maxLength)` | Trim + truncate |
| `validateEventName(name)` | Event name rules |
| `validateDescription(desc)` | Description rules |
| `validateEventDate(date)` | Date format rules |

---

## 3. Secrets & Credentials

### Environment Variables

| Variable | Scope | Storage |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | `.env.local` (gitignored) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | `.env.local` (gitignored) |
| `GALLERY_COOKIE_SECRET` | Server only | `.env.local` (gitignored) |

### Findings

- No hardcoded secrets in source code
- `.env*` files excluded from version control via `.gitignore`
- All Supabase config loaded from `process.env`
- Gallery access tokens generated cryptographically (`crypto.randomBytes`)
- PINs generated with `crypto.getRandomValues`
- PINs hashed with bcrypt (12 salt rounds) before storage
- `GALLERY_COOKIE_SECRET` never exposed to client-side code

---

## 4. Session & Cookie Security

### Gallery Access Cookie

| Property | Value |
|----------|-------|
| Name | `gallery_access` |
| HttpOnly | `true` |
| Secure | `true` in production |
| SameSite | `Lax` |
| Path | `/gallery/{slug}` |
| MaxAge | 2 hours (7200 seconds) |
| Payload | HMAC-signed JSON (SHA-256) |

### Cookie Security Properties

- Payload is HMAC-signed to prevent tampering
- Signature verified on every access via `decodePayload()`
- Expiry checked both at cookie level and in `verifyGalleryAccess()`
- Cookie path-scoped to specific gallery (`/gallery/{slug}`)
- Different galleries get different cookies (cross-gallery isolation)

### Session Management

- Supabase SSR handles session refresh in middleware
- Sessions validated on every request via `supabase.auth.getUser()`
- Unauthenticated users redirected from protected routes to `/login`
- Authenticated users redirected from login/register to their workspace

---

## 5. Security Headers

Configured in `next.config.ts`:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restrict browser features |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |

---

## 6. Rate Limiting

### Gallery PIN Verification

| Setting | Value |
|---------|-------|
| Max attempts | 5 per slug |
| Window | 15 minutes |
| Storage | In-memory (resets on server restart) |
| Scope | Per gallery slug |

**Note:** In-memory rate limiting is sufficient for low-traffic deployments. For high-traffic production, consider Redis-backed rate limiting.

---

## 7. Data Access Patterns

### Row-Level Security (RLS)

All 6 tables have RLS enabled with 27 policies total.

| Table | Policies | Summary |
|-------|----------|---------|
| `profiles` | 3 | Users read own; Admins read all; Users update own `full_name` |
| `events` | 5 | Admins CRUD own; Team Members read assigned |
| `event_members` | 4 | Admins manage for own events; Team Members view own |
| `photos` | 5 | Team Members insert to assigned; Admins manage for own events |
| `galleries` | 4 | Admins CRUD own; Team Members: no access |
| `gallery_photos` | 3 | Admins manage for own galleries; Team Members: no access |

### Storage Policies

| Policy | Role | Operation |
|--------|------|-----------|
| Team members can upload photos | TEAM_MEMBER | INSERT to `event-photos` |
| Authenticated users can read | Authenticated | SELECT from `event-photos` |
| Admins can delete | ADMIN | DELETE from `event-photos` |

### Server-Side Auth Checks

| Operation | Check |
|-----------|-------|
| Admin event CRUD | `requireAdmin()` + `created_by` ownership |
| Team photo upload | `requireTeamMember()` + `event_members` membership |
| Photo selection/deletion | Admin event ownership |
| Gallery management | `requireAdmin()` + `verifyEventOwnership()` |
| Gallery access | PIN verification + signed cookie + expiry check |

---

## 8. Storage Security

### Supabase Storage (`event-photos` bucket)

| Property | Value |
|----------|-------|
| Bucket name | `event-photos` |
| Public | `false` (private) |
| Path convention | `{event_id}/{timestamp}_{index}.{ext}` |

### Storage Access Controls

- Private bucket — no public access
- Signed URLs generated only after authorization
- Customer signed URLs: 15-minute expiry
- Admin/Team signed URLs: 1-hour expiry
- Upload validation: file type, size, count limits
- Storage rollback on DB insert failure

### Photo Binary Separation

- Photo binary data stored in Supabase Storage
- Database stores only metadata (id, event_id, filename, storage_path, etc.)
- No photo binaries in database backups
- Object storage scales independently from database

---

## 9. Known Limitations

| Issue | Risk | Mitigation |
|-------|------|------------|
| Rate limiter is in-memory | Low | Resets on server restart; sufficient for low-traffic |
| No CSRF token on server actions | Low | Next.js SameSite cookies + server action origin check |
| No request logging/monitoring | Medium | Add for production deployment |
| No IP-based rate limiting | Low | Gallery PIN attempts limited per slug |
| Rate limiter resets on cold start | Low | Serverless cold starts reset in-memory state |

---

## 10. Security Test Checklist

### Authentication
- [x] Unauthenticated user redirected from `/admin/*` to `/login`
- [x] Unauthenticated user redirected from `/team/*` to `/login`
- [x] Unauthenticated user can access `/gallery/*` pages
- [x] Unauthenticated user can access `/`, `/login`, `/register`
- [x] Authenticated admin redirected from `/login` to `/admin`
- [x] Authenticated team member redirected from `/login` to `/team`
- [x] Admin cannot access `/team` workspace
- [x] Team member cannot access `/admin` workspace

### Authorization
- [x] Admin cannot manage events created by other admins
- [x] Team member cannot upload to unassigned events
- [x] Team member cannot delete photos (admin only)
- [x] Team member cannot toggle photo selection (admin only)
- [x] Admin cannot modify galleries for events they don't own
- [x] Customer cannot access unpublished galleries
- [x] Customer cannot access galleries without valid PIN cookie

### Gallery Access
- [x] PIN verification rejects non-6-digit input
- [x] PIN verification rejects incorrect PIN
- [x] Rate limiting blocks after 5 failed attempts
- [x] Rate limiting resets after 15-minute window
- [x] Gallery cookie is HttpOnly (not accessible via JavaScript)
- [x] Gallery cookie is Secure in production (HTTPS only)
- [x] Gallery cookie expires after 2 hours
- [x] Gallery cookie is path-scoped to specific gallery
- [x] Gallery cookie signature prevents tampering

### Input Validation
- [x] Event name rejects empty input
- [x] Event name rejects input > 200 chars
- [x] Description rejects input > 2000 chars
- [x] Event date rejects invalid date format
- [x] File upload rejects files > 10MB
- [x] File upload rejects non-image MIME types
- [x] File upload rejects > 20 files per batch
- [x] Gallery PIN rejects non-numeric input

### Security Headers
- [x] `X-Content-Type-Options: nosniff` present
- [x] `X-Frame-Options: DENY` present
- [x] `X-XSS-Protection: 1; mode=block` present
- [x] `Referrer-Policy: strict-origin-when-cross-origin` present
- [x] `Permissions-Policy` restricts camera, microphone, geolocation
- [x] `Strict-Transport-Security` present in production

### Data Protection
- [x] No secrets hardcoded in source code
- [x] `.env*` files gitignored
- [x] Supabase credentials loaded from environment variables
- [x] PINs hashed with bcrypt (not stored in plaintext)
- [x] Gallery access tokens cryptographically generated
- [x] Signed URLs expire (15 min for customers, 1 hour for admin)
- [x] Gallery access cookie uses HMAC signature

### Tested in Automated Tests
- [x] HMAC signature verification (unit test)
- [x] Tamper detection (unit test)
- [x] Token expiry detection (unit test)
- [x] Cross-gallery isolation (unit test)
- [x] Input validation (18 unit tests)
- [x] Security headers (E2E tests)
- [x] Protected route redirects (E2E tests)
- [x] httpOnly cookie (E2E test)
- [x] Error handling — no stack traces (E2E test)
