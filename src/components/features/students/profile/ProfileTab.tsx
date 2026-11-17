"use client";

import { useDates, type Dates } from "@/components/features/shell/dateDisplay";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { LABELS } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { EDIT_DETAILS_TEXT, PROFILE_TEXT } from "@/constants/studentProfile";
import {
  COUNTRY_LABELS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
  QUALIFICATION_LABELS,
  SOURCE_LABELS,
  Source,
  TARGET_LEVEL_LABELS,
} from "@/constants/students";
import type { StudentProfile } from "@/lib/api";
import { formatIntake, todayIso } from "@/lib/dates";
import { addressText, ageOn } from "@/lib/students";

import { AcademicHistory } from "./AcademicHistory";
import { DetailsSection } from "./DetailsSection";
import { EnglishTests } from "./EnglishTests";
import { PassportWarningBanner } from "./PassportWarning";
import { WorkExperienceSection } from "./WorkExperienceSection";

/**
 * Everything known about the Student, in sections (spec 35f): Personal, Contact, Family, Passport,
 * Addresses, Education, Work experience, Test scores and Plans. It only shows: their counsellor or
 * an Admin changes it all on the Edit details page (issue 81).
 */
export function ProfileTab({ profile }: { profile: StudentProfile }) {
  const dates = useDates();

  return (
    <div className="grid gap-8">
      {profile.canEditDetails && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ButtonLink href={ROUTES.studentEdit(profile.id)} variant="primary" icon="edit">
            {LABELS.editDetails}
          </ButtonLink>
          <span className="text-small text-ink-2">{EDIT_DETAILS_TEXT.profileHint}</span>
        </div>
      )}
      <div className="wide:grid-cols-2 grid items-start gap-8">
        <DetailsSection
          title={PROFILE_TEXT.personal}
          items={[
            { label: PROFILE_TEXT.fullName, value: profile.name },
            { label: LABELS.dateOfBirth, value: dateOfBirth(profile.dateOfBirth, dates) },
            { label: PROFILE_TEXT.gender, value: labelOf(GENDER_LABELS, profile.gender) },
            {
              label: PROFILE_TEXT.maritalStatus,
              value: labelOf(MARITAL_STATUS_LABELS, profile.maritalStatus),
            },
            { label: PROFILE_TEXT.nationality, value: profile.nationality },
          ]}
        />
        <DetailsSection
          title={PROFILE_TEXT.contact}
          items={[
            {
              label: PROFILE_TEXT.mobile,
              value: <span className="tabular-nums">{profile.phone}</span>,
            },
            { label: LABELS.email, value: profile.email },
          ]}
        />
        <DetailsSection
          title={PROFILE_TEXT.family}
          items={[
            { label: PROFILE_TEXT.father, value: profile.fatherName },
            { label: PROFILE_TEXT.mother, value: profile.motherName },
            {
              label: PROFILE_TEXT.guardian,
              value: profile.guardianName === "" ? "" : <Guardian profile={profile} />,
            },
          ]}
        />
        <DetailsSection
          title={PROFILE_TEXT.passport}
          before={<PassportWarningBanner profile={profile} />}
          items={[
            { label: PROFILE_TEXT.number, value: profile.passportNumber },
            { label: PROFILE_TEXT.placeOfIssue, value: profile.passportPlaceOfIssue },
            { label: PROFILE_TEXT.issuedOn, value: dateOrEmpty(profile.passportIssueDate, dates) },
            {
              label: PROFILE_TEXT.expiresOn,
              value: dateOrEmpty(profile.passportExpiryDate, dates),
            },
          ]}
        />
        <DetailsSection
          title={PROFILE_TEXT.addresses}
          items={[
            { label: PROFILE_TEXT.permanent, value: addressText(profile.permanentAddress) },
            {
              label: PROFILE_TEXT.mailing,
              value: profile.mailingSameAsPermanent
                ? PROFILE_TEXT.sameAsPermanent
                : addressText(profile.mailingAddress),
            },
          ]}
        />
        <DetailsSection
          title={PROFILE_TEXT.education}
          items={[
            {
              label: LABELS.highestQualification,
              value: QUALIFICATION_LABELS[profile.highestQualification],
            },
            { label: LABELS.pastDegree, value: profile.pastDegree },
          ]}
        />
        <AcademicHistory records={profile.academicRecords} />
        <WorkExperienceSection profile={profile} />
        <EnglishTests scores={profile.testScores} />
        <DetailsSection
          title={PROFILE_TEXT.plans}
          items={[
            { label: LABELS.wantsToStudyIn, value: COUNTRY_LABELS[profile.country] },
            {
              label: LABELS.alsoConsidering,
              value: profile.otherCountries.map((country) => COUNTRY_LABELS[country]).join(", "),
            },
            {
              label: PROFILE_TEXT.targetLevel,
              value: labelOf(TARGET_LEVEL_LABELS, profile.targetLevel),
            },
            { label: LABELS.preferredCourse, value: profile.preferredCourse },
            {
              label: LABELS.preferredIntake,
              value: profile.preferredIntake === "" ? "" : formatIntake(profile.preferredIntake),
            },
            { label: LABELS.howTheyFoundUs, value: howTheyFoundUs(profile) },
            { label: LABELS.firstVisit, value: dates.date(profile.createdAt.slice(0, 10)) },
          ]}
        />
      </div>
    </div>
  );
}

/** The guardian's name, their relation in brackets, and their mobile under it. */
function Guardian({ profile }: { profile: StudentProfile }) {
  const relation = profile.guardianRelation === "" ? "" : ` (${profile.guardianRelation})`;
  return (
    <>
      {profile.guardianName}
      {relation}
      {profile.guardianPhone !== "" && (
        <span className="text-small text-ink-2 block font-normal tabular-nums">
          {profile.guardianPhone}
        </span>
      )}
    </>
  );
}

/** A choice's word, or "" when none was given. */
function labelOf<Value extends string>(labels: Record<Value, string>, value: Value | ""): string {
  return value === "" ? "" : labels[value];
}

function dateOrEmpty(date: string | null, dates: Dates): string {
  return date === null ? "" : dates.date(date);
}

/** "12 Apr 2003 (23 years old)". */
function dateOfBirth(date: string | null, dates: Dates) {
  if (date === null) return "";
  return (
    <>
      {dates.date(date)}{" "}
      <span className="text-ink-2 font-normal">
        ({PROFILE_TEXT.yearsOld(ageOn(date, todayIso()))})
      </span>
    </>
  );
}

function howTheyFoundUs(profile: StudentProfile): string {
  const source = SOURCE_LABELS[profile.source];
  return profile.source === Source.SubAgent && profile.subAgentName !== ""
    ? `${source}, ${profile.subAgentName}`
    : source;
}
