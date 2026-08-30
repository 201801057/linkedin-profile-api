import type { DatePart, LinkedInProfile, ProfileImage } from "../types/profile.js";
import type {
  RawCertification,
  RawEducation,
  RawHonor,
  RawPicture,
  RawPosition,
  RawProfileView,
  RawProject,
  RawTimePeriod,
  RawTimePeriodBoundary,
  RawVolunteerExperience,
} from "./rawTypes.js";
import { buildCanonicalProfileUrl } from "./urlUtils.js";

function toDatePart(boundary: RawTimePeriodBoundary | undefined): DatePart | null {
  if (!boundary || (boundary.month == null && boundary.year == null)) return null;
  return { month: boundary.month ?? null, year: boundary.year ?? null };
}

function imagesFromPicture(picture: RawPicture | undefined): ProfileImage[] {
  const vector = picture?.["com.linkedin.common.VectorImage"];
  if (!vector?.rootUrl || !vector.artifacts) return [];
  return vector.artifacts
    .filter((a) => a.fileIdentifyingUrlPathSegment)
    .map((a) => ({
      url: `${vector.rootUrl}${a.fileIdentifyingUrlPathSegment}`,
      width: a.width ?? 0,
      height: a.height ?? 0,
    }))
    .sort((a, b) => b.width - a.width);
}

function mapExperience(position: RawPosition) {
  const timePeriod: RawTimePeriod | undefined = position.timePeriod;
  const endDate = toDatePart(timePeriod?.endDate);
  return {
    title: position.title ?? null,
    companyName: position.company?.miniCompany?.name ?? position.companyName ?? null,
    companyUrn: position.company?.miniCompany?.entityUrn ?? null,
    employmentType: position.employmentType ?? null,
    location: position.locationName ?? null,
    description: position.description ?? null,
    startDate: toDatePart(timePeriod?.startDate),
    endDate,
    isCurrent: endDate === null,
  };
}

function mapEducation(education: RawEducation) {
  return {
    schoolName: education.school?.schoolName ?? education.schoolName ?? null,
    degreeName: education.degreeName ?? null,
    fieldOfStudy: education.fieldOfStudy ?? null,
    grade: education.grade ?? null,
    activities: education.activities ?? null,
    description: education.description ?? null,
    startDate: toDatePart(education.timePeriod?.startDate),
    endDate: toDatePart(education.timePeriod?.endDate),
  };
}

function mapCertification(cert: RawCertification) {
  return {
    name: cert.name ?? null,
    authority: cert.authority ?? null,
    licenseNumber: cert.licenseNumber ?? null,
    url: cert.url ?? null,
    startDate: toDatePart(cert.timePeriod?.startDate),
    endDate: toDatePart(cert.timePeriod?.endDate),
  };
}

function mapHonor(honor: RawHonor) {
  return {
    title: honor.title ?? null,
    issuer: honor.issuer ?? null,
    description: honor.description ?? null,
    issueDate: toDatePart(honor.issueDate),
  };
}

function mapVolunteer(entry: RawVolunteerExperience) {
  return {
    role: entry.role ?? null,
    companyName: entry.companyName ?? null,
    cause: entry.cause ?? null,
    description: entry.description ?? null,
    startDate: toDatePart(entry.timePeriod?.startDate),
    endDate: toDatePart(entry.timePeriod?.endDate),
  };
}

function mapProject(project: RawProject) {
  return {
    title: project.title ?? null,
    description: project.description ?? null,
    url: project.url ?? null,
    startDate: toDatePart(project.timePeriod?.startDate),
    endDate: toDatePart(project.timePeriod?.endDate),
  };
}

/** Turns a raw, undocumented Voyager `profileView` payload into our stable schema. */
export function mapProfileView(raw: RawProfileView, fallbackPublicIdentifier: string): LinkedInProfile {
  const profile = raw.profile ?? {};
  const mini = profile.miniProfile;
  const publicIdentifier = mini?.publicIdentifier ?? fallbackPublicIdentifier;

  const firstName = profile.firstName ?? mini?.firstName ?? null;
  const lastName = profile.lastName ?? mini?.lastName ?? null;

  return {
    publicIdentifier,
    profileUrl: buildCanonicalProfileUrl(publicIdentifier),
    urn: profile.entityUrn ?? mini?.entityUrn ?? null,

    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" ") || null,
    headline: profile.headline ?? mini?.occupation ?? null,
    about: profile.summary ?? null,

    location: {
      full: profile.locationName ?? profile.geoLocationName ?? null,
      country: profile.geoCountryName ?? null,
    },
    industry: profile.industryName ?? null,

    profileImages: imagesFromPicture(mini?.picture),
    backgroundImages: imagesFromPicture(profile.backgroundImage),

    experience: (raw.positionView?.elements ?? []).map(mapExperience),
    education: (raw.educationView?.elements ?? []).map(mapEducation),
    skills: (raw.skillView?.elements ?? []).map((s) => s.name).filter((n): n is string => Boolean(n)),
    certifications: (raw.certificationView?.elements ?? []).map(mapCertification),
    languages: (raw.languageView?.elements ?? []).map((l) => ({
      name: l.name ?? null,
      proficiency: l.proficiency ?? null,
    })),
    honors: (raw.honorView?.elements ?? []).map(mapHonor),
    volunteer: (raw.volunteerExperienceView?.elements ?? []).map(mapVolunteer),
    projects: (raw.projectView?.elements ?? []).map(mapProject),

    fetchedAt: new Date().toISOString(),
  };
}
