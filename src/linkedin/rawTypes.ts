/**
 * Loose shape of LinkedIn's undocumented `/identity/profiles/{id}/profileView`
 * Voyager response, reconstructed from public reverse-engineering references
 * (see README "Approach"). LinkedIn does not publish or version this schema
 * and has changed it before, so every field here is optional on purpose - the
 * mapper (mapper.ts) is written to degrade gracefully rather than throw when
 * a section is missing or reshaped.
 */

export interface RawVectorArtifact {
  width?: number;
  height?: number;
  fileIdentifyingUrlPathSegment?: string;
}

export interface RawVectorImage {
  rootUrl?: string;
  artifacts?: RawVectorArtifact[];
}

export interface RawPicture {
  "com.linkedin.common.VectorImage"?: RawVectorImage;
}

export interface RawMiniProfile {
  entityUrn?: string;
  objectUrn?: string;
  publicIdentifier?: string;
  firstName?: string;
  lastName?: string;
  occupation?: string;
  picture?: RawPicture;
}

export interface RawTimePeriodBoundary {
  month?: number;
  year?: number;
}

export interface RawTimePeriod {
  startDate?: RawTimePeriodBoundary;
  endDate?: RawTimePeriodBoundary;
}

export interface RawProfile {
  entityUrn?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  summary?: string;
  industryName?: string;
  locationName?: string;
  geoLocationName?: string;
  geoCountryName?: string;
  miniProfile?: RawMiniProfile;
  backgroundImage?: RawPicture;
}

export interface RawMiniCompany {
  name?: string;
  entityUrn?: string;
}

export interface RawPosition {
  title?: string;
  employmentType?: string;
  locationName?: string;
  description?: string;
  timePeriod?: RawTimePeriod;
  company?: {
    miniCompany?: RawMiniCompany;
  };
  companyName?: string;
}

export interface RawSchool {
  schoolName?: string;
  entityUrn?: string;
}

export interface RawEducation {
  school?: RawSchool;
  schoolName?: string;
  degreeName?: string;
  fieldOfStudy?: string;
  grade?: string;
  activities?: string;
  description?: string;
  timePeriod?: RawTimePeriod;
}

export interface RawSkill {
  name?: string;
}

export interface RawCertification {
  name?: string;
  authority?: string;
  licenseNumber?: string;
  url?: string;
  timePeriod?: RawTimePeriod;
}

export interface RawLanguage {
  name?: string;
  proficiency?: string;
}

export interface RawHonor {
  title?: string;
  issuer?: string;
  description?: string;
  issueDate?: RawTimePeriodBoundary;
}

export interface RawVolunteerExperience {
  role?: string;
  companyName?: string;
  cause?: string;
  description?: string;
  timePeriod?: RawTimePeriod;
}

export interface RawProject {
  title?: string;
  description?: string;
  url?: string;
  timePeriod?: RawTimePeriod;
}

export interface RawElementsView<T> {
  elements?: T[];
}

export interface RawProfileView {
  profile?: RawProfile;
  positionView?: RawElementsView<RawPosition>;
  educationView?: RawElementsView<RawEducation>;
  skillView?: RawElementsView<RawSkill>;
  certificationView?: RawElementsView<RawCertification>;
  languageView?: RawElementsView<RawLanguage>;
  honorView?: RawElementsView<RawHonor>;
  volunteerExperienceView?: RawElementsView<RawVolunteerExperience>;
  projectView?: RawElementsView<RawProject>;
}
