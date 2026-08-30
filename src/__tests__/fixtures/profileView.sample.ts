import type { RawProfileView } from "../../linkedin/rawTypes.js";

/**
 * A hand-built sample resembling the shape of a real profileView response,
 * used to unit test the mapper without needing live LinkedIn access.
 */
export const sampleProfileView: RawProfileView = {
  profile: {
    entityUrn: "urn:li:fs_profile:ACoAAB123456",
    firstName: "Jane",
    lastName: "Doe",
    headline: "Senior Software Engineer at Acme Corp",
    summary: "I build things.",
    industryName: "Software Development",
    locationName: "San Francisco Bay Area",
    geoCountryName: "United States",
    miniProfile: {
      entityUrn: "urn:li:fs_miniProfile:ACoAAB123456",
      objectUrn: "urn:li:member:123456",
      publicIdentifier: "jane-doe-123456",
      firstName: "Jane",
      lastName: "Doe",
      occupation: "Senior Software Engineer at Acme Corp",
      picture: {
        "com.linkedin.common.VectorImage": {
          rootUrl: "https://media.licdn.com/dms/image/",
          artifacts: [
            { width: 100, height: 100, fileIdentifyingUrlPathSegment: "100_100/profile.jpg" },
            { width: 400, height: 400, fileIdentifyingUrlPathSegment: "400_400/profile.jpg" },
          ],
        },
      },
    },
  },
  positionView: {
    elements: [
      {
        title: "Senior Software Engineer",
        employmentType: "Full-time",
        locationName: "San Francisco, California",
        description: "Working on the platform team.",
        timePeriod: { startDate: { month: 3, year: 2022 } },
        company: {
          miniCompany: { name: "Acme Corp", entityUrn: "urn:li:fs_miniCompany:12345" },
        },
      },
      {
        title: "Software Engineer",
        locationName: "San Francisco, California",
        timePeriod: {
          startDate: { month: 6, year: 2019 },
          endDate: { month: 2, year: 2022 },
        },
        company: {
          miniCompany: { name: "Beta Inc", entityUrn: "urn:li:fs_miniCompany:6789" },
        },
      },
    ],
  },
  educationView: {
    elements: [
      {
        school: { schoolName: "State University", entityUrn: "urn:li:fs_miniSchool:999" },
        degreeName: "B.S.",
        fieldOfStudy: "Computer Science",
        timePeriod: { startDate: { year: 2015 }, endDate: { year: 2019 } },
      },
    ],
  },
  skillView: {
    elements: [{ name: "JavaScript" }, { name: "TypeScript" }, { name: "Node.js" }],
  },
  certificationView: {
    elements: [
      {
        name: "AWS Certified Developer",
        authority: "Amazon Web Services",
        licenseNumber: "ABC123",
        timePeriod: { startDate: { month: 1, year: 2021 } },
      },
    ],
  },
  languageView: {
    elements: [{ name: "English", proficiency: "NATIVE_OR_BILINGUAL" }],
  },
  honorView: { elements: [] },
  volunteerExperienceView: { elements: [] },
  projectView: { elements: [] },
};
