# Testing Documentation

## Overview

PhotoShare uses two testing layers:
- **Unit tests** (Vitest) — Test pure logic without external dependencies
- **E2E tests** (Playwright) — Test complete user flows in a real browser

---

## Test Commands

| Command | Description | Dependencies |
|---------|-------------|-------------|
| `npm test` | Run all unit tests | None |
| `npm run test:unit` | Run unit tests | None |
| `npm run test:unit:watch` | Run unit tests in watch mode | None |
| `npm run test:e2e` | Run E2E tests | Playwright browser, dev server |
| `npm run test:e2e:ui` | Run E2E tests with UI mode | Playwright browser, dev server |
| `npm run test:e2e:headed` | Run E2E tests with visible browser | Playwright browser, dev server |

### Additional Verification Commands

| Command | Description |
|---------|-------------|
| `npx tsc --noEmit` | TypeScript type checking |
| `npm run lint` | ESLint linting |
| `npm run build` | Production build verification |

---

## Unit Tests (Vitest)

### Framework

- **Vitest** with jsdom environment
- Path alias `@` → `src/` configured
- Setup file mocks Next.js server-side APIs (`cookies()`, `redirect()`, `useRouter()`)

### Test Files

#### `tests/unit/validation.test.ts` — 18 tests

Tests the validation utilities in `src/lib/validation.ts`.

| Function | Tests |
|----------|-------|
| `isValidUUID` | Accepts valid v4 UUIDs; rejects empty, short, long, non-hex strings |
| `isValidPin` | Accepts 6-digit strings; rejects non-6-digit, alphabetic, special chars |
| `isValidSlug` | Accepts 24-char lowercase alphanumeric; rejects uppercase, special chars, wrong length |
| `sanitizeString` | Trims whitespace, truncates to max length |
| `validateEventName` | Rejects empty names; rejects names > 200 chars |
| `validateDescription` | Accepts empty; rejects > 2000 chars |
| `validateEventDate` | Accepts null/empty; rejects invalid date formats |

#### `tests/unit/gallery-access.test.ts` — 11 tests

Tests the gallery access cookie cryptographic logic (encode/decode/sign/verify).

| Test Area | Tests |
|-----------|-------|
| Payload encoding | Encode/decode round-trip preserves all fields |
| Tamper detection | Rejects modified galleryId (HMAC mismatch) |
| Tamper detection | Rejects modified signature |
| Invalid input | Rejects invalid base64url, corrupted JSON, missing fields |
| Determinism | Same input produces same signature |
| Token generation | Generates unique 64-char hex tokens |
| Expiry detection | Detects expired and valid tokens |
| Cross-gallery isolation | Gallery A cookie does not grant access to Gallery B |

### Running Unit Tests

```bash
npm test
# or
npm run test:unit
```

No external services required. All mocking is handled by the setup file.

---

## E2E Tests (Playwright)

### Framework

- **Playwright** with Chromium browser
- Tests run against local dev server (port 3000)
- Configured in `playwright.config.ts`

### Test Files

#### `tests/e2e/auth.spec.ts` — Authentication Flows

| Test | Description |
|------|-------------|
| Login page renders | Email and password fields visible |
| Register page renders | Required fields visible |
| Login rejects empty submission | Form stays on login page |
| Register rejects empty submission | Form stays on register page |
| Login links to register | Navigation link present |
| Register links to login | Navigation link present |

#### `tests/e2e/authorization.spec.ts` — Protected Routes

| Test | Description |
|------|-------------|
| `/admin` redirect | Unauthenticated → `/login` |
| `/team` redirect | Unauthenticated → `/login` |
| `/admin/events` redirect | Unauthenticated → `/login` |
| `/team/events` redirect | Unauthenticated → `/login` |
| Login redirect preserves destination | `next` parameter in URL |

#### `tests/e2e/events.spec.ts` — Event Management

| Test | Description |
|------|-------------|
| Admin events requires auth | Redirects to `/login` |
| Team events requires auth | Redirects to `/login` |
| Event form requires auth | Redirects to `/login` |

#### `tests/e2e/photos.spec.ts` — Photo Upload

| Test | Description |
|------|-------------|
| Upload requires auth | Redirects to `/login` |

#### `tests/e2e/gallery.spec.ts` — Gallery Access

| Test | Description |
|------|-------------|
| Invalid slug handling | Page loads without crash |
| httpOnly cookie | `gallery_access` not in `document.cookie` |

#### `tests/e2e/customer-gallery.spec.ts` — Customer Gallery

| Test | Description |
|------|-------------|
| `/customer` renders | No auth required |
| Mobile viewport | Renders at 375px width |
| Tablet viewport | Renders at 768px width |

#### `tests/e2e/security.spec.ts` — Security Headers

| Test | Header | Expected Value |
|------|--------|---------------|
| X-Content-Type-Options | `x-content-type-options` | `nosniff` |
| X-Frame-Options | `x-frame-options` | `DENY` |
| X-XSS-Protection | `x-xss-protection` | `1; mode=block` |
| Referrer-Policy | `referrer-policy` | `strict-origin-when-cross-origin` |
| Permissions-Policy | `permissions-policy` | `camera=()`, `microphone=()`, `geolocation=()` |
| Login error handling | — | No stack traces exposed |
| Gallery error handling | — | No Supabase internals exposed |
| Protected route behavior | — | Redirect, not 403 |

#### `tests/e2e/accessibility.spec.ts` — Accessibility

| Test | Description |
|------|-------------|
| Single h1 | Landing page has exactly one h1 |
| Input labels | Login form inputs have associated labels |
| Lang attribute | Pages have `lang` attribute on `<html>` |
| Keyboard navigation | Tab focuses interactive elements |
| Semantic landmarks | Landing page has `<main>` element |
| Mobile hamburger | Accessible button with aria-label |

### Running E2E Tests

```bash
# Install Playwright browser (one-time)
npx playwright install chromium

# Run tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed
```

### Prerequisites

1. Playwright Chromium browser installed
2. Dev server running on port 3000 (or configured `PORT`)
3. For auth-gated tests: `.env.local` with real Supabase credentials

---

## Security Test Coverage

### Authentication Boundaries

| Check | Unit | E2E |
|-------|------|-----|
| Unauthenticated redirect from `/admin` | — | `authorization.spec.ts` |
| Unauthenticated redirect from `/team` | — | `authorization.spec.ts` |
| Login form validation | — | `auth.spec.ts` |
| Register form validation | — | `auth.spec.ts` |

### Gallery Access Security

| Check | Unit | E2E |
|-------|------|-----|
| HMAC signature verification | `gallery-access.test.ts` | — |
| Tamper detection (modified payload) | `gallery-access.test.ts` | — |
| Tamper detection (modified signature) | `gallery-access.test.ts` | — |
| Token expiry detection | `gallery-access.test.ts` | — |
| Cross-gallery isolation | `gallery-access.test.ts` | — |
| httpOnly cookie | — | `gallery.spec.ts` |
| PIN format validation | `validation.test.ts` | — |

### Input Validation

| Check | Unit | E2E |
|-------|------|-----|
| UUID format | `validation.test.ts` | — |
| PIN format (6 digits) | `validation.test.ts` | — |
| Slug format (24 char) | `validation.test.ts` | — |
| Event name rules | `validation.test.ts` | — |
| Description rules | `validation.test.ts` | — |
| Date format | `validation.test.ts` | — |

### Security Headers

| Check | E2E |
|-------|-----|
| X-Content-Type-Options | `security.spec.ts` |
| X-Frame-Options | `security.spec.ts` |
| X-XSS-Protection | `security.spec.ts` |
| Referrer-Policy | `security.spec.ts` |
| Permissions-Policy | `security.spec.ts` |
| HSTS | `security.spec.ts` |

### Error Handling

| Check | E2E |
|-------|-----|
| No stack traces in login errors | `security.spec.ts` |
| No Supabase internals in gallery errors | `security.spec.ts` |
| Redirect behavior (not 403) | `security.spec.ts` |

---

## Environment Limitations

### Unit Tests

- **No limitations** — All 29 unit tests run without external services
- Mocking handles Next.js server-side APIs

### E2E Tests

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Playwright browser not installed | E2E tests cannot run | `npx playwright install chromium` |
| Supabase not configured | Auth-gated tests redirect to login | Security header and UI tests still work |
| No production credentials | Cannot test full auth flows | Tests are structurally ready for Supabase connection |

### Status Legend

| Status | Meaning |
|--------|---------|
| **PASS** | Test verified and passing locally |
| **READY** | Test written, structurally correct, requires Supabase to fully validate |
| **BLOCKED** | Cannot run until prerequisite is met |

---

## Test Fixtures

### `tests/fixtures/test-photo.jpg`

A minimal valid JPEG file (332 bytes) used for upload-related tests.

---

## CI/CD Integration

### Recommended Pipeline

```yaml
# Example GitHub Actions workflow
steps:
  - name: Install dependencies
    run: npm ci

  - name: Type check
    run: npx tsc --noEmit

  - name: Lint
    run: npm run lint

  - name: Unit tests
    run: npm test

  - name: Build
    run: npm run build

  # E2E tests require Supabase and Playwright browser
  # - name: Install Playwright
  #   run: npx playwright install chromium
  # - name: E2E tests
  #   run: npm run test:e2e
```

---

## Test File Structure

```
tests/
  unit/
    setup.ts                       # Vitest setup (Next.js API mocks)
    validation.test.ts             # Input validation tests (18 tests)
    gallery-access.test.ts         # Gallery cookie crypto tests (11 tests)
  e2e/
    auth.spec.ts                   # Authentication flow tests
    authorization.spec.ts          # Protected route tests
    events.spec.ts                 # Event management tests
    photos.spec.ts                 # Photo upload tests
    gallery.spec.ts                # Gallery access tests
    customer-gallery.spec.ts       # Customer gallery tests
    security.spec.ts               # Security header tests
    accessibility.spec.ts          # Accessibility tests
  fixtures/
    test-photo.jpg                 # Minimal JPEG fixture
```
