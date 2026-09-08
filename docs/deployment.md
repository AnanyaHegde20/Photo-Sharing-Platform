# Deployment Guide

## Deployment Target

**Platform:** Vercel
**Framework:** Next.js (auto-detected by Vercel)

---

## Prerequisites

- GitHub repository with the project code
- Vercel account (free tier works)
- Supabase project with:
  - Database migrations applied
  - Storage bucket configured
  - Authentication enabled

---

## Step 1: Connect Repository

1. Log in to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import the GitHub repository
4. Vercel auto-detects Next.js — framework settings are pre-filled
5. Click "Deploy" (initial deploy will fail without environment variables — this is expected)

---

## Step 2: Configure Environment Variables

In Vercel project settings > Environment Variables, add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
| `GALLERY_COOKIE_SECRET` | A strong random string (32+ chars) | Production, Preview |

### Generating `GALLERY_COOKIE_SECRET`

Generate a secure random string:

```bash
# macOS/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Security Notes

- `GALLERY_COOKIE_SECRET` is server-only — never exposed to the browser
- Do not use the same secret for development and production
- Do not commit secrets to version control
- Configure secrets through Vercel's environment variable interface

---

## Step 3: Configure Supabase

### Database Migrations

Apply both migration files through the Supabase SQL Editor:

1. `supabase/migrations/20240101000000_initial_schema.sql`
2. `supabase/migrations/20240102000000_gallery_event_unique.sql`

### Storage Bucket

Ensure the `event-photos` bucket exists and is **private**:
- Bucket name: `event-photos`
- Public: `false`
- Storage policies applied (Team Member upload, authenticated read, Admin delete)

### Authentication

In Supabase Dashboard > Authentication > Providers:
- Email/Password: Enabled
- Configure email templates as needed

### CORS (if needed)

If accessing Supabase from a different domain, configure allowed origins in Supabase Dashboard > Settings > API.

---

## Step 4: Deploy

1. After configuring environment variables, trigger a new deployment
2. Vercel builds the Next.js application
3. Build output is deployed to Vercel's edge network

### Build Command

Vercel auto-detects Next.js and runs:
```
npm run build
```

### Build Verification

The build should complete without errors. Common issues:
- Missing environment variables → build-time errors
- TypeScript errors → `npx tsc --noEmit` should pass
- ESLint errors → `npm run lint` should pass

---

## Step 5: Verify Production

### Routes to Test

| Route | Expected Behavior |
|-------|-------------------|
| `/` | Landing page loads |
| `/login` | Login form renders |
| `/register` | Registration form renders |
| `/admin` | Redirects to `/login` (unauthenticated) |
| `/team` | Redirects to `/login` (unauthenticated) |
| `/customer` | Customer page loads |
| `/gallery/test-slug` | Gallery page loads (may show not-found) |

### Authentication Flow

1. Register a new Admin account
2. Login with the new account
3. Verify redirect to `/admin`
4. Create an event
5. Verify event appears in dashboard

### Gallery Flow

1. Create an event as Admin
2. Add a Team Member
3. Upload photos as Team Member
4. Select photos as Admin
5. Create and publish gallery
6. Copy gallery URL
7. Open gallery URL in incognito/private window
8. Enter PIN
9. Verify photos display

### Security Headers

Verify in browser DevTools > Network > Response Headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## Production Checklist

- [ ] Supabase project configured and running
- [ ] Database migrations applied (both files)
- [ ] Storage bucket `event-photos` created and private
- [ ] RLS enabled on all 6 tables
- [ ] Storage policies applied
- [ ] Authentication enabled (Email/Password)
- [ ] Environment variables configured in Vercel:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `GALLERY_COOKIE_SECRET`
- [ ] Production build succeeds
- [ ] Landing page loads
- [ ] Login/register forms work
- [ ] Admin can create events
- [ ] Team Member can upload photos
- [ ] Admin can curate and publish galleries
- [ ] Customer can access gallery with PIN
- [ ] Gallery cookie is HttpOnly and Secure
- [ ] Security headers present
- [ ] Responsive UI verified (mobile/tablet/desktop)
- [ ] No secrets in client-side code

---

## Troubleshooting

### Build Fails with Missing Environment Variables

Ensure all three environment variables are set in Vercel for the correct environment (Production/Preview/Development).

### Authentication Not Working

1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
2. Check Supabase Dashboard > Authentication > Providers is enabled
3. Verify CORS settings if accessing from a custom domain

### Gallery Access Fails

1. Verify `GALLERY_COOKIE_SECRET` is set
2. Check that the gallery is `PUBLISHED` status
3. Verify the gallery has a `pin_hash` set
4. Ensure the slug in the URL matches the gallery slug

### Photos Not Loading

1. Verify `event-photos` bucket exists and is private
2. Check Storage policies are applied
3. Verify signed URLs are being generated (check server logs)

---

## Environment Management

| Environment | Vercel | Supabase | Notes |
|-------------|--------|----------|-------|
| Development | `npm run dev` | Local or remote | `.env.local` |
| Preview | Vercel preview deployments | Same production project | Uses Preview env vars |
| Production | Vercel production deployment | Production project | Uses Production env vars |

---

## Scaling Considerations

- **Vercel**: Auto-scales with traffic; serverless functions have execution limits
- **Supabase**: Free tier has connection limits; upgrade for production traffic
- **Storage**: Supabase Storage scales; consider CDN for global delivery
- **Rate Limiting**: In-memory rate limiter resets on cold starts; consider Redis for production

---

## Demo Data Setup

After Supabase is configured and migrations are applied, create demo accounts manually through the Supabase Dashboard or application registration.

### Manual Demo Setup Steps

#### 1. Create Admin Account

1. Go to `/register` on the deployed application
2. Register with:
   - Full Name: `Demo Admin`
   - Email: `<your-email>`
   - Password: `<your-password>`
3. In Supabase Dashboard > Authentication > Users, find the new user
4. In Supabase Dashboard > SQL Editor, run:

```sql
UPDATE public.profiles
SET role = 'ADMIN'
WHERE id = '<user-id>';
```

5. Login with the Admin account at `/login`

#### 2. Create Team Member Account

1. Go to `/register` on the deployed application
2. Register with:
   - Full Name: `Demo Team Member`
   - Email: `<another-email>`
   - Password: `<your-password>`
3. The account defaults to `TEAM_MEMBER` role (no SQL update needed)

#### 3. Create Demo Event and Gallery

As Admin:
1. Create a new event
2. Add the Team Member to the event
3. Have the Team Member upload photos
4. Select photos for the gallery
5. Create gallery, set PIN, publish
6. Copy the gallery URL

#### 4. Test Customer Flow

1. Open the gallery URL in an incognito/private window
2. Enter the 6-digit PIN
3. Verify photos display

### Notes

- Registration defaults all new users to `TEAM_MEMBER` role
- Only Supabase SQL Editor can promote a user to `ADMIN`
- This prevents privilege escalation through the registration form
- Demo credentials are not hardcoded — they are created during setup
