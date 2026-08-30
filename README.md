# linkedin-profile-api

A hosted HTTP API that takes a LinkedIn profile URL and returns structured
JSON (name, headline, location, about, experience, education, skills,
certifications, languages, profile images, and more).

Built for the Tross engineering challenge. Per the clarification email, this
is a **purely reverse-engineered solution that talks directly to LinkedIn's
own internal API** - there is no headless browser, no Puppeteer/Playwright,
and no HTML scraping anywhere in this codebase.

## Approach

When you're logged into linkedin.com, the pages you see are themselves
populated by calls your browser makes to LinkedIn's internal REST API,
nicknamed "Voyager" (`https://www.linkedin.com/voyager/api/...`). It isn't
public or documented, but it's just HTTP + JSON, and it's what every
third-party "LinkedIn scraper" tool (including the PhantomBuster automation
linked in the challenge) is built on under the hood, whether or not it
happens to also drive a browser on top of it.

This project calls that API directly:

1. **Authenticate once, out of band.** LinkedIn's Voyager API is guarded by
   two cookies - `li_at` (the session token) and `JSESSIONID` (echoed back on
   every request as a `Csrf-Token` header, LinkedIn's anti-CSRF scheme). This
   server does not automate the login form: you log in through a real browser
   one time and hand the server the resulting cookie pair as secrets (see
   [Getting your session cookie](#getting-your-session-cookie)). This is
   deliberate - programmatic `POST`s to LinkedIn's login endpoint are
   aggressively challenged with CAPTCHAs/verification codes from server IPs,
   which makes that path unreliable for a hosted service. A programmatic
   username/password fallback is still implemented
   (`src/linkedin/session.ts`) to show the reverse-engineered login flow
   itself, but it is **not** the recommended or default path.
2. **Resolve the profile URL to a "public identifier."** `.../in/jane-doe-123/`
   → `jane-doe-123` (`src/linkedin/urlUtils.ts`).
3. **Call the Voyager profile endpoint** -
   `GET /voyager/api/identity/profiles/{publicIdentifier}/profileView` -
   which returns one large JSON document containing the profile's summary,
   positions, education, skills, certifications, languages, honors,
   volunteer experience, projects, and profile/background images in a single
   round trip (`src/linkedin/voyagerClient.ts`).
4. **Map that undocumented payload onto a stable, documented schema**
   (`src/linkedin/mapper.ts` + `src/types/profile.ts`), so API consumers
   never see LinkedIn's internal field names and the mapping layer is the
   only thing that needs to change if/when LinkedIn reshapes their API.

Two things worth calling out as deliberate engineering choices, not
afterthoughts:

- **A single serialized request queue** (`src/linkedin/voyagerClient.ts`)
  paces every outbound call to LinkedIn at least `LINKEDIN_MIN_REQUEST_INTERVAL_MS`
  apart, regardless of how many API requests arrive concurrently. LinkedIn's
  abuse detection cares about request *rate* from a session, not just volume.
- **An in-memory TTL cache** (`src/cache/memoryCache.ts`) means the same
  profile isn't re-fetched from LinkedIn more than once per
  `PROFILE_CACHE_TTL_MS`. Every cache hit is one fewer request against the
  account backing this service.

## Known limitations

- **This is an unofficial, reverse-engineered integration.** LinkedIn does
  not publish or version this API, and their User Agreement prohibits
  automated scraping. This project uses your own credentials/session to
  access data your account can already see - the same trust boundary a
  browser operates in - but LinkedIn can still rate-limit, challenge, or
  restrict an account it detects behaving unusually. **Use a secondary/
  throwaway LinkedIn account for this, never your primary one**, and treat
  this as a technical proof-of-concept rather than a production data source.
- **Schema drift.** The `profileView` response shape used here was
  reconstructed from public reverse-engineering references, not official
  docs, and LinkedIn has changed this API's shape before without notice. If
  fields start coming back empty, set `ENABLE_RAW_DEBUG=true` and pass
  `?includeRaw=true` to inspect the untransformed upstream payload and adjust
  `src/linkedin/mapper.ts` accordingly - this is the single biggest
  maintenance burden of the approach and there's no way around it for an
  unofficial API.
- **Visibility depends on the viewing account.** Some fields (contact info,
  full connection-only sections) are only visible to the account's 1st/2nd
  degree connections or to LinkedIn Premium subscribers, regardless of the
  API. What this endpoint returns is exactly what the authenticated account
  is allowed to see on that profile - the same ceiling a logged-in browser
  session would hit.
- **URL support.** Only current-style `linkedin.com/in/<identifier>` URLs
  (with or without a locale suffix or query string) are supported. The very
  old `linkedin.com/profile/view?id=...` format is not handled.
- **Programmatic login fallback is best-effort.** If you configure
  `LINKEDIN_EMAIL`/`LINKEDIN_PASSWORD` instead of a cookie, expect it to fail
  whenever LinkedIn serves a CAPTCHA or "verify it's you" checkpoint - there
  is no CAPTCHA-solving in this project, by design.
- **Single-instance cache.** The profile cache is in-process memory, so it's
  empty after a restart and isn't shared across multiple instances. Fine for
  the free/single-instance deployment this challenge calls for; would need
  Redis (or similar) to scale beyond one instance.
- **Rate limits are for the *account*, not just this API.** The per-caller
  rate limit on this server (30 req/min, see `src/index.ts`) is a safety net
  for the backing LinkedIn account, not a product SLA guarantee.

## API documentation

All `/v1/*` routes require an API key (protecting *this* server, separate
from the LinkedIn session behind it) via the `X-Api-Key` header, unless you
deliberately leave `API_KEYS` empty for local development.

### `GET /healthz`

No auth required. Returns `{ "status": "ok" }` - used as the Render health
check.

### `GET /v1/profile?url=<linkedin-url>`

| Query param   | Required | Description                                                                 |
|---------------|----------|-------------------------------------------------------------------------------|
| `url`         | yes      | A LinkedIn profile URL (`https://www.linkedin.com/in/jane-doe-123/`) or a bare public identifier (`jane-doe-123`). |
| `refresh`     | no       | `true` to bypass the cache and force a fresh fetch from LinkedIn.            |
| `includeRaw`  | no       | `true` to also return the untransformed upstream payload. Only honored if the server has `ENABLE_RAW_DEBUG=true`. |

```bash
curl -H "X-Api-Key: $API_KEY" \
  "https://<your-deployment>/v1/profile?url=https://www.linkedin.com/in/jane-doe-123/"
```

### `POST /v1/profile`

Same behavior, JSON body instead of query params:

```bash
curl -X POST -H "X-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"url": "https://www.linkedin.com/in/jane-doe-123/"}' \
  https://<your-deployment>/v1/profile
```

### Response shape

```jsonc
{
  "profile": {
    "publicIdentifier": "jane-doe-123",
    "profileUrl": "https://www.linkedin.com/in/jane-doe-123/",
    "urn": "urn:li:fs_profile:ACoAAB...",
    "firstName": "Jane",
    "lastName": "Doe",
    "fullName": "Jane Doe",
    "headline": "Senior Software Engineer at Acme Corp",
    "about": "I build things.",
    "location": { "full": "San Francisco Bay Area", "country": "United States" },
    "industry": "Software Development",
    "profileImages": [{ "url": "https://media.licdn.com/...", "width": 400, "height": 400 }],
    "backgroundImages": [],
    "experience": [
      {
        "title": "Senior Software Engineer",
        "companyName": "Acme Corp",
        "companyUrn": "urn:li:fs_miniCompany:12345",
        "employmentType": "Full-time",
        "location": "San Francisco, California",
        "description": "Working on the platform team.",
        "startDate": { "month": 3, "year": 2022 },
        "endDate": null,
        "isCurrent": true
      }
    ],
    "education": [
      {
        "schoolName": "State University",
        "degreeName": "B.S.",
        "fieldOfStudy": "Computer Science",
        "grade": null,
        "activities": null,
        "description": null,
        "startDate": { "month": null, "year": 2015 },
        "endDate": { "month": null, "year": 2019 }
      }
    ],
    "skills": ["JavaScript", "TypeScript", "Node.js"],
    "certifications": [
      { "name": "AWS Certified Developer", "authority": "Amazon Web Services", "licenseNumber": "ABC123", "url": null, "startDate": { "month": 1, "year": 2021 }, "endDate": null }
    ],
    "languages": [{ "name": "English", "proficiency": "NATIVE_OR_BILINGUAL" }],
    "honors": [],
    "volunteer": [],
    "projects": [],
    "fetchedAt": "2026-08-30T12:00:00.000Z"
  },
  "meta": { "cached": false }
}
```

### Errors

Errors are JSON: `{ "error": "..." }` (validation errors also include a
`details` array from Zod). Status codes:

| Status | Meaning                                                                  |
|--------|---------------------------------------------------------------------------|
| 400    | Malformed request - not a recognizable LinkedIn URL, or bad query/body.  |
| 401    | Missing/invalid `X-Api-Key`.                                             |
| 404    | LinkedIn returned nothing for that identifier (profile doesn't exist / isn't public). |
| 429    | This server's own per-caller rate limit, or LinkedIn itself throttling. |
| 502    | This server's LinkedIn session is invalid/expired/challenged - the operator needs to refresh `LINKEDIN_LI_AT`/`LINKEDIN_JSESSIONID`. |
| 500    | Unexpected error.                                                        |

## Setup

### Prerequisites

- Node.js 20+
- A LinkedIn account you're comfortable using for this (see
  [Known limitations](#known-limitations) - a secondary account is strongly
  recommended over your primary one).

### Getting your session cookie

1. In a normal browser, log in to [linkedin.com](https://www.linkedin.com).
2. Open DevTools → **Application** (Chrome/Edge) or **Storage** (Firefox) →
   **Cookies** → `https://www.linkedin.com`.
3. Copy the value of the `li_at` cookie → `LINKEDIN_LI_AT`.
4. Copy the value of the `JSESSIONID` cookie (it looks like
   `"ajax:1234567890123456789"`, quotes included in the raw value) → strip
   the surrounding quotes and set it as `LINKEDIN_JSESSIONID`.
5. Put both in your `.env` (local) or in your hosting provider's secret/env
   var settings (production). Never commit them.

These cookies are long-lived but not permanent - if the API starts returning
502s, repeat this process to get a fresh pair.

### Local development

```bash
npm install
cp .env.example .env
# edit .env: set API_KEYS and LINKEDIN_LI_AT / LINKEDIN_JSESSIONID
npm run dev
```

The server listens on `http://localhost:3000` (`PORT` in `.env`).

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest - unit tests for URL parsing + the profileView mapper
npm run build        # compiles to dist/
npm start             # runs the compiled build (what Render runs in production)
```

### Deploying to Render

This repo includes a `render.yaml` blueprint.

1. Push this repository to your own GitHub account.
2. In the Render dashboard: **New → Blueprint**, point it at the repo. Render
   will read `render.yaml` and create a free web service.
3. Fill in the secret env vars Render will prompt for (marked `sync: false`
   in `render.yaml`): `API_KEYS`, `LINKEDIN_LI_AT`, `LINKEDIN_JSESSIONID`.
4. Deploy. Render builds with `npm ci && npm run build` and runs `npm start`;
   `/healthz` is used as the health check path. Your API is now live at
   `https://<service-name>.onrender.com` over HTTPS.

(Any other Node-friendly host works the same way: `npm run build && npm
start`, with the env vars from `.env.example` set as secrets.)

## Project layout

```
src/
  config.ts              # env var loading/validation
  logger.ts               # pino logger
  index.ts                # Express app: middleware, routes, boot
  routes/profile.route.ts # GET/POST /v1/profile - validation via zod
  middleware/
    apiKeyAuth.ts          # X-Api-Key auth for this server's own API
    errorHandler.ts        # maps typed errors -> HTTP status codes
  linkedin/
    session.ts              # li_at/JSESSIONID handling + login fallback
    voyagerClient.ts         # low-level HTTP client, request queue, retries
    profileService.ts        # orchestrates fetch + cache + mapping
    urlUtils.ts               # profile URL -> public identifier
    rawTypes.ts                # loose types for LinkedIn's undocumented payload
    mapper.ts                  # raw payload -> our stable schema
    errors.ts                   # typed error classes
  cache/memoryCache.ts       # in-process TTL cache
  types/profile.ts            # public response schema
  __tests__/                   # vitest unit tests + fixtures
```

## License

MIT
