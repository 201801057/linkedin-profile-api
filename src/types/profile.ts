export interface DatePart {
  month: number | null;
  year: number | null;
}

export interface ProfileImage {
  url: string;
  width: number;
  height: number;
}

export interface ExperienceEntry {
  title: string | null;
  companyName: string | null;
  companyUrn: string | null;
  employmentType: string | null;
  location: string | null;
  description: string | null;
  startDate: DatePart | null;
  endDate: DatePart | null;
  isCurrent: boolean;
}

export interface EducationEntry {
  schoolName: string | null;
  degreeName: string | null;
  fieldOfStudy: string | null;
  grade: string | null;
  activities: string | null;
  description: string | null;
  startDate: DatePart | null;
  endDate: DatePart | null;
}

export interface CertificationEntry {
  name: string | null;
  authority: string | null;
  licenseNumber: string | null;
  url: string | null;
  startDate: DatePart | null;
  endDate: DatePart | null;
}

export interface LanguageEntry {
  name: string | null;
  proficiency: string | null;
}

export interface HonorEntry {
  title: string | null;
  issuer: string | null;
  description: string | null;
  issueDate: DatePart | null;
}

export interface VolunteerEntry {
  role: string | null;
  companyName: string | null;
  cause: string | null;
  description: string | null;
  startDate: DatePart | null;
  endDate: DatePart | null;
}

export interface ProjectEntry {
  title: string | null;
  description: string | null;
  url: string | null;
  startDate: DatePart | null;
  endDate: DatePart | null;
}

export interface LinkedInProfile {
  publicIdentifier: string;
  profileUrl: string;
  urn: string | null;

  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  headline: string | null;
  about: string | null;

  location: {
    full: string | null;
    country: string | null;
  };
  industry: string | null;

  profileImages: ProfileImage[];
  backgroundImages: ProfileImage[];

  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  certifications: CertificationEntry[];
  languages: LanguageEntry[];
  honors: HonorEntry[];
  volunteer: VolunteerEntry[];
  projects: ProjectEntry[];

  fetchedAt: string;
}
