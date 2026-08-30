import { config } from "../config.js";
import { logger } from "../logger.js";
import { getSession, invalidateSession } from "./session.js";
import {
  LinkedInRateLimitError,
  LinkedInSessionExpiredError,
  ProfileNotFoundError,
} from "./errors.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const VOYAGER_BASE = "https://www.linkedin.com/voyager/api";

/**
 * A tiny serial queue: LinkedIn's abuse detection cares a lot about request
 * *rate*, not just volume, so every outbound call to LinkedIn - regardless of
 * which incoming API request triggered it - is funneled through here and
 * spaced out by at least `minRequestIntervalMs`.
 */
let queueTail: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queueTail.then(async () => {
    const wait = Math.max(0, lastRequestAt + config.linkedin.minRequestIntervalMs - Date.now());
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastRequestAt = Date.now();
    return task();
  });
  // Keep the chain alive even if this particular task rejects.
  queueTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

interface VoyagerRequestOptions {
  /** Path under /voyager/api, e.g. "/identity/profiles/john-doe/profileView" */
  path: string;
  query?: Record<string, string>;
  /** Set true to allow one retry after refreshing the session. */
  allowSessionRetry?: boolean;
}

async function performRequest(path: string, query: Record<string, string> | undefined) {
  const session = await getSession();
  const url = new URL(VOYAGER_BASE + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  return fetch(url, {
    method: "GET",
    // LinkedIn bounces an invalid/expired session to a login or checkpoint
    // page via a 302 instead of a 401/403. Following it would just chase
    // redirects forever (it redirected right back to the same URL in
    // testing); handling it manually lets us treat it as an auth failure.
    redirect: "manual",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.linkedin.normalized+json+2.1",
      "Accept-Language": "en-US,en;q=0.9",
      "X-Restli-Protocol-Version": "2.0.0",
      "X-Li-Lang": "en_US",
      Referer: "https://www.linkedin.com/",
      "Csrf-Token": session.jsessionId,
      Cookie: `li_at=${session.liAt}; JSESSIONID="${session.jsessionId}"`,
    },
  });
}

/**
 * Does the actual request + status handling, including the one-retry-after
 * re-auth policy. Recurses into *itself* on retry, never back into
 * `voyagerGet`/`enqueue` - re-entering the queue from a task that's still
 * occupying it would deadlock (the retry can never get a turn because the
 * in-progress task it's waiting on is itself).
 */
async function executeVoyagerRequest<T>(
  path: string,
  query: Record<string, string> | undefined,
  allowSessionRetry: boolean,
): Promise<T> {
  logger.debug({ path }, "LinkedIn Voyager request");
  const response = await performRequest(path, query);

  const isAuthChallenge =
    response.status === 401 || response.status === 403 || (response.status >= 300 && response.status < 400);

  if (isAuthChallenge) {
    invalidateSession();
    if (allowSessionRetry) {
      logger.warn("LinkedIn session rejected, attempting one re-authentication");
      return executeVoyagerRequest<T>(path, query, false);
    }
    throw new LinkedInSessionExpiredError();
  }

  if (response.status === 404) {
    const identifier = path.split("/").filter(Boolean).pop() ?? path;
    throw new ProfileNotFoundError(identifier);
  }

  if (response.status === 429) {
    throw new LinkedInRateLimitError();
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LinkedIn Voyager request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

/**
 * Calls a Voyager REST endpoint and returns the parsed JSON body.
 * Throws typed errors for the LinkedIn-specific failure modes we actually
 * expect to hit in production (expired session, rate limiting, 404 profile).
 */
export function voyagerGet<T = unknown>(options: VoyagerRequestOptions): Promise<T> {
  const { path, query, allowSessionRetry = true } = options;
  return enqueue(() => executeVoyagerRequest<T>(path, query, allowSessionRetry));
}
