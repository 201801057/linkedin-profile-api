import { describe, expect, it } from "vitest";
import { mapProfileView } from "../linkedin/mapper.js";
import { sampleProfileView } from "./fixtures/profileView.sample.js";

describe("mapProfileView", () => {
  const profile = mapProfileView(sampleProfileView, "jane-doe-123456");

  it("maps basic identity fields", () => {
    expect(profile.publicIdentifier).toBe("jane-doe-123456");
    expect(profile.profileUrl).toBe("https://www.linkedin.com/in/jane-doe-123456/");
    expect(profile.fullName).toBe("Jane Doe");
    expect(profile.headline).toBe("Senior Software Engineer at Acme Corp");
    expect(profile.about).toBe("I build things.");
    expect(profile.location.full).toBe("San Francisco Bay Area");
    expect(profile.location.country).toBe("United States");
    expect(profile.industry).toBe("Software Development");
  });

  it("maps profile images, largest first", () => {
    expect(profile.profileImages).toHaveLength(2);
    expect(profile.profileImages[0].width).toBe(400);
    expect(profile.profileImages[0].url).toBe(
      "https://media.licdn.com/dms/image/400_400/profile.jpg",
    );
  });

  it("maps experience, marking the open-ended entry as current", () => {
    expect(profile.experience).toHaveLength(2);
    const [current, past] = profile.experience;
    expect(current.title).toBe("Senior Software Engineer");
    expect(current.companyName).toBe("Acme Corp");
    expect(current.isCurrent).toBe(true);
    expect(current.endDate).toBeNull();

    expect(past.companyName).toBe("Beta Inc");
    expect(past.isCurrent).toBe(false);
    expect(past.endDate).toEqual({ month: 2, year: 2022 });
  });

  it("maps education", () => {
    expect(profile.education).toHaveLength(1);
    expect(profile.education[0].schoolName).toBe("State University");
    expect(profile.education[0].fieldOfStudy).toBe("Computer Science");
    expect(profile.education[0].startDate).toEqual({ month: null, year: 2015 });
  });

  it("maps skills to a flat string array", () => {
    expect(profile.skills).toEqual(["JavaScript", "TypeScript", "Node.js"]);
  });

  it("maps certifications and languages", () => {
    expect(profile.certifications).toHaveLength(1);
    expect(profile.certifications[0].name).toBe("AWS Certified Developer");
    expect(profile.languages).toEqual([{ name: "English", proficiency: "NATIVE_OR_BILINGUAL" }]);
  });

  it("degrades gracefully when sections are entirely missing", () => {
    const minimal = mapProfileView({}, "fallback-id");
    expect(minimal.publicIdentifier).toBe("fallback-id");
    expect(minimal.fullName).toBeNull();
    expect(minimal.experience).toEqual([]);
    expect(minimal.skills).toEqual([]);
    expect(minimal.profileImages).toEqual([]);
  });
});
