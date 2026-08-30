export class InvalidLinkedInUrlError extends Error {
  constructor(input: string) {
    super(`"${input}" is not a recognizable LinkedIn profile URL`);
    this.name = "InvalidLinkedInUrlError";
  }
}

/**
 * Extracts the "public identifier" (the slug LinkedIn uses internally to key a
 * profile, e.g. "john-doe-3a4b5c6") from a profile URL.
 *
 * Accepts things like:
 *   https://www.linkedin.com/in/john-doe-3a4b5c6/
 *   https://linkedin.com/in/john-doe-3a4b5c6
 *   www.linkedin.com/in/john-doe-3a4b5c6/en
 *   linkedin.com/in/john-doe-3a4b5c6?originalSubdomain=in
 *   john-doe-3a4b5c6                (bare identifier, passed straight through)
 */
export function extractPublicIdentifier(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new InvalidLinkedInUrlError(input);
  }

  // Bare identifier, no URL structure at all (no dots, no slashes).
  if (!trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }

  let url: URL;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    url = new URL(withProtocol);
  } catch {
    throw new InvalidLinkedInUrlError(input);
  }

  const host = url.hostname.toLowerCase();
  const isLinkedInHost = host === "linkedin.com" || host.endsWith(".linkedin.com");
  if (!isLinkedInHost) {
    throw new InvalidLinkedInUrlError(input);
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const inIndex = segments.indexOf("in");
  if (inIndex === -1 || !segments[inIndex + 1]) {
    throw new InvalidLinkedInUrlError(input);
  }

  const identifier = decodeURIComponent(segments[inIndex + 1]);
  return identifier;
}

export function buildCanonicalProfileUrl(publicIdentifier: string): string {
  return `https://www.linkedin.com/in/${publicIdentifier}/`;
}
