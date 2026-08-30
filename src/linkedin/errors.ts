export class LinkedInAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkedInAuthError";
  }
}

/** Thrown when LinkedIn responds with a CAPTCHA / 2FA / "unusual activity" checkpoint. */
export class LinkedInCheckpointError extends LinkedInAuthError {
  constructor() {
    super(
      "LinkedIn presented a security checkpoint (CAPTCHA / email verification) instead of " +
        "logging in. Programmatic username+password login is frequently challenged like this. " +
        "Log in through a real browser once and set LINKEDIN_LI_AT / LINKEDIN_JSESSIONID instead " +
        "(see README).",
    );
    this.name = "LinkedInCheckpointError";
  }
}

export class LinkedInSessionExpiredError extends LinkedInAuthError {
  constructor() {
    super(
      "The configured LinkedIn session has expired or was rejected. Re-authenticate and update " +
        "LINKEDIN_LI_AT / LINKEDIN_JSESSIONID.",
    );
    this.name = "LinkedInSessionExpiredError";
  }
}

export class ProfileNotFoundError extends Error {
  constructor(publicIdentifier: string) {
    super(`No LinkedIn profile found for identifier "${publicIdentifier}"`);
    this.name = "ProfileNotFoundError";
  }
}

export class LinkedInRateLimitError extends Error {
  constructor() {
    super("LinkedIn responded with a rate-limit / throttling status (429).");
    this.name = "LinkedInRateLimitError";
  }
}
