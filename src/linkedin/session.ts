import { config } from "../config.js";
import { logger } from "../logger.js";
import { LinkedInCheckpointError, LinkedInAuthError } from "./errors.js";

/**
 * LinkedIn's internal ("Voyager") web API is what linkedin.com's own front-end
 * calls after you log in through a browser. It is authenticated with two
 * cookies:
 *
 *  - `li_at`       — the actual session token.
 *  - `JSESSIONID`  — a value LinkedIn also expects echoed back, verbatim, as
 *                    an `csrf-token` request header on every call (their
 *                    anti-CSRF scheme). It arrives quoted, e.g. "ajax:12345".
 *
 * There is no public OAuth flow for this - it's exactly what your own browser
 * does, just called directly instead of through rendered pages. This module
 * holds that cookie pair and knows how to obtain it either from configuration
 * (recommended) or, as a fallback, by replaying LinkedIn's own login form
 * submission.
 */

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export interface SessionCookies {
  liAt: string;
  jsessionId: string; // unquoted, e.g. "ajax:1234567890123456789"
}

let cachedSession: SessionCookies | null = null;
let inFlightBootstrap: Promise<SessionCookies> | null = null;

function parseSetCookie(setCookieHeaders: string[], name: string): string | undefined {
  for (const header of setCookieHeaders) {
    const match = header.match(new RegExp(`${name}=([^;]+)`));
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return undefined;
}

function getSetCookieHeaders(response: Response): string[] {
  // Node's fetch (undici) exposes multiple Set-Cookie headers via getSetCookie().
  const headersWithGetSetCookie = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  return headersWithGetSetCookie.getSetCookie?.() ?? [];
}

/**
 * Recommended path: both cookies were captured by hand from a real, logged-in
 * browser session (see README "Getting your session cookie") and passed in
 * via environment variables. No network call needed.
 */
function sessionFromConfig(): SessionCookies | null {
  if (config.linkedin.liAt && config.linkedin.jsessionId) {
    return { liAt: config.linkedin.liAt, jsessionId: config.linkedin.jsessionId };
  }
  return null;
}

/**
 * If only `li_at` was captured (no JSESSIONID), we can mint a fresh
 * JSESSIONID by making a single authenticated request and reading the
 * Set-Cookie LinkedIn sends back - the same thing a browser does on its next
 * page load.
 */
async function seedJsessionFromLiAt(liAt: string): Promise<SessionCookies> {
  const response = await fetch("https://www.linkedin.com/feed/", {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Cookie: `li_at=${liAt}`,
    },
  });

  const setCookies = getSetCookieHeaders(response);
  const jsessionRaw = parseSetCookie(setCookies, "JSESSIONID");
  if (!jsessionRaw) {
    throw new LinkedInAuthError(
      "Could not obtain a JSESSIONID using the configured LINKEDIN_LI_AT cookie - it is likely " +
        "expired or invalid. Re-capture it from a fresh browser login.",
    );
  }
  return { liAt, jsessionId: jsessionRaw.replace(/^"|"$/g, "") };
}

/**
 * Fallback path: replay LinkedIn's own login form submission. This is
 * frequently intercepted by a CAPTCHA / "let's do a quick security check"
 * challenge when called from a server IP, which is precisely why the cookie
 * based path above is the recommended one. Kept for completeness / to
 * demonstrate the reverse-engineered login flow itself.
 */
async function loginWithCredentials(email: string, password: string): Promise<SessionCookies> {
  const loginPage = await fetch("https://www.linkedin.com/uas/login", {
    headers: { "User-Agent": DEFAULT_USER_AGENT },
  });
  const seedCookies = getSetCookieHeaders(loginPage);
  const seedJsession = parseSetCookie(seedCookies, "JSESSIONID");
  if (!seedJsession) {
    throw new LinkedInAuthError("Failed to seed a login session with LinkedIn.");
  }
  const jsessionId = seedJsession.replace(/^"|"$/g, "");

  const body = new URLSearchParams({
    session_key: email,
    session_password: password,
    JSESSIONID: `"${jsessionId}"`,
  });

  const response = await fetch("https://www.linkedin.com/uas/login-submit", {
    method: "POST",
    redirect: "manual",
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Restli-Protocol-Version": "2.0.0",
      Cookie: `JSESSIONID="${jsessionId}"`,
    },
    body: body.toString(),
  });

  const resultCookies = getSetCookieHeaders(response);
  const liAt = parseSetCookie(resultCookies, "li_at");

  if (!liAt) {
    // LinkedIn responds with a 3xx to a /checkpoint/ URL when it wants a
    // CAPTCHA or verification code instead of granting a session.
    const location = response.headers.get("location") ?? "";
    if (response.status >= 300 || location.includes("checkpoint")) {
      throw new LinkedInCheckpointError();
    }
    throw new LinkedInAuthError("LinkedIn login did not return a session cookie.");
  }

  const freshJsession = parseSetCookie(resultCookies, "JSESSIONID") ?? jsessionId;
  return { liAt, jsessionId: freshJsession.replace(/^"|"$/g, "") };
}

async function bootstrapSession(): Promise<SessionCookies> {
  const fromConfig = sessionFromConfig();
  if (fromConfig) {
    logger.info("Using LinkedIn session from LINKEDIN_LI_AT + LINKEDIN_JSESSIONID");
    return fromConfig;
  }

  if (config.linkedin.liAt) {
    logger.info("Seeding JSESSIONID from configured LINKEDIN_LI_AT");
    return seedJsessionFromLiAt(config.linkedin.liAt);
  }

  if (config.linkedin.email && config.linkedin.password) {
    logger.warn(
      "No LINKEDIN_LI_AT configured - falling back to programmatic email/password login. " +
        "This is likely to hit a CAPTCHA/checkpoint from a server IP.",
    );
    return loginWithCredentials(config.linkedin.email, config.linkedin.password);
  }

  throw new LinkedInAuthError(
    "No LinkedIn credentials configured. Set LINKEDIN_LI_AT (recommended) or " +
      "LINKEDIN_EMAIL + LINKEDIN_PASSWORD.",
  );
}

/** Returns cached session cookies, bootstrapping (and caching) them on first use. */
export async function getSession(): Promise<SessionCookies> {
  if (cachedSession) return cachedSession;
  if (!inFlightBootstrap) {
    inFlightBootstrap = bootstrapSession()
      .then((session) => {
        cachedSession = session;
        return session;
      })
      .finally(() => {
        inFlightBootstrap = null;
      });
  }
  return inFlightBootstrap;
}

/** Drops the cached session, forcing the next getSession() call to re-bootstrap. */
export function invalidateSession(): void {
  cachedSession = null;
}

export const _internal = { DEFAULT_USER_AGENT };
