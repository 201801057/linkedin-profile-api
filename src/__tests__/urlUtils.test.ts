import { describe, expect, it } from "vitest";
import { extractPublicIdentifier, buildCanonicalProfileUrl, InvalidLinkedInUrlError } from "../linkedin/urlUtils.js";

describe("extractPublicIdentifier", () => {
  it("parses a standard profile URL", () => {
    expect(extractPublicIdentifier("https://www.linkedin.com/in/john-doe-3a4b5c6/")).toBe(
      "john-doe-3a4b5c6",
    );
  });

  it("parses a URL without protocol", () => {
    expect(extractPublicIdentifier("www.linkedin.com/in/john-doe-3a4b5c6")).toBe("john-doe-3a4b5c6");
  });

  it("parses a URL with a locale suffix", () => {
    expect(extractPublicIdentifier("https://www.linkedin.com/in/john-doe-3a4b5c6/en")).toBe(
      "john-doe-3a4b5c6",
    );
  });

  it("parses a URL with query params", () => {
    expect(
      extractPublicIdentifier("https://linkedin.com/in/john-doe-3a4b5c6?originalSubdomain=in"),
    ).toBe("john-doe-3a4b5c6");
  });

  it("passes through a bare identifier", () => {
    expect(extractPublicIdentifier("john-doe-3a4b5c6")).toBe("john-doe-3a4b5c6");
  });

  it("rejects a non-LinkedIn URL", () => {
    expect(() => extractPublicIdentifier("https://example.com/in/john-doe")).toThrow(
      InvalidLinkedInUrlError,
    );
  });

  it("rejects a LinkedIn URL with no /in/ segment", () => {
    expect(() => extractPublicIdentifier("https://www.linkedin.com/feed/")).toThrow(
      InvalidLinkedInUrlError,
    );
  });

  it("rejects empty input", () => {
    expect(() => extractPublicIdentifier("")).toThrow(InvalidLinkedInUrlError);
  });
});

describe("buildCanonicalProfileUrl", () => {
  it("builds a canonical URL from an identifier", () => {
    expect(buildCanonicalProfileUrl("john-doe-3a4b5c6")).toBe(
      "https://www.linkedin.com/in/john-doe-3a4b5c6/",
    );
  });
});
