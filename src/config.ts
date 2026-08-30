import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(optional("PORT", "3000")),
  nodeEnv: optional("NODE_ENV", "development"),

  // Public API key(s) that callers of *our* API must present. Comma separated.
  apiKeys: optional("API_KEYS", "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),

  linkedin: {
    // Primary auth mode: a session cookie captured from a real, manual LinkedIn
    // login (see README "Getting your session cookie"). This is the recommended
    // and most reliable mode.
    liAt: process.env.LINKEDIN_LI_AT ?? "",
    jsessionId: process.env.LINKEDIN_JSESSIONID ?? "",

    // Fallback auth mode: programmatic username/password login. LinkedIn very
    // frequently challenges this with a CAPTCHA or email verification code, so
    // it's provided for completeness but is not the recommended path.
    email: process.env.LINKEDIN_EMAIL ?? "",
    password: process.env.LINKEDIN_PASSWORD ?? "",

    // Minimum delay (ms) enforced between consecutive outbound requests to
    // LinkedIn, to stay well under the radar of their abuse detection.
    minRequestIntervalMs: Number(optional("LINKEDIN_MIN_REQUEST_INTERVAL_MS", "1500")),

    // How long a fetched profile is cached in memory before we're willing to
    // re-fetch it from LinkedIn (ms).
    profileCacheTtlMs: Number(optional("PROFILE_CACHE_TTL_MS", String(1000 * 60 * 60 * 6))), // 6h
  },

  // When true, callers may pass ?includeRaw=true to get the untransformed
  // upstream Voyager payload back alongside the mapped profile. Useful for
  // diagnosing mapper drift when LinkedIn reshapes their internal API; left
  // off by default since the raw payload is far larger and LinkedIn-shaped.
  enableRawDebug: optional("ENABLE_RAW_DEBUG", "false") === "true",
};

export function assertLinkedInCredentialsConfigured(): void {
  const hasCookieAuth = Boolean(config.linkedin.liAt);
  const hasPasswordAuth = Boolean(config.linkedin.email && config.linkedin.password);
  if (!hasCookieAuth && !hasPasswordAuth) {
    throw new Error(
      "No LinkedIn credentials configured. Set LINKEDIN_LI_AT (recommended) or " +
        "LINKEDIN_EMAIL + LINKEDIN_PASSWORD in the environment. See README.md.",
    );
  }
}

// Re-export for callers that just want to assert something is required at boot.
export { required };
