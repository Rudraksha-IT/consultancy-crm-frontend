"use client";

import { useState, type ReactNode } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { DateField } from "@/components/ui/DateField";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { LABELS } from "@/constants/messages";
import { PROFILE_TEXT } from "@/constants/studentProfile";
import { Source } from "@/constants/students";
import type { Address, AddressInput, StudentDetailsChange, StudentProfile } from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { FormGroup } from "../FormGroup";
import {
  COUNTRY_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  PROVINCE_OPTIONS,
  QUALIFICATION_OPTIONS,
  SOURCE_OPTIONS,
  TARGET_LEVEL_OPTIONS,
} from "../options";
import { readField } from "./formData";
import { PreferredIntakeField } from "./PreferredIntakeField";

export type SectionFieldsProps = {
  profile: StudentProfile;
  /** Messages for each refused field, by the form's field names. */
  errors: Partial<Record<string, string[]>>;
};

/** One section of the Edit details page: its fields, and what the submitted form sends. */
export type SectionEdit = {
  Fields: (props: SectionFieldsProps) => ReactNode;
  /** The section's details from the submitted form. */
  read: (form: FormData) => StudentDetailsChange;
};

/** "Not given" (or another word for none), then the choices. */
function withNone(none: string, options: readonly SelectOption[]): SelectOption[] {
  return [{ value: "", label: none }, ...options];
}

const GRID = "tablet:grid-cols-2 grid gap-5";

export const PERSONAL_EDIT: SectionEdit = {
  Fields: function PersonalFields({ profile, errors }: SectionFieldsProps) {
    const dates = useDates();
    return (
      <div className={GRID}>
        <TextField
          label={PROFILE_TEXT.fullName}
          name="name"
          autoComplete="off"
          defaultValue={profile.name}
          errors={errors.name}
        />
        <DateField
          label={LABELS.dateOfBirth}
          name="dateOfBirth"
          display={dates.display}
          max={todayIso()}
          defaultValue={profile.dateOfBirth ?? ""}
          isOptional
          errors={errors.dateOfBirth}
        />
        <SelectField
          label={PROFILE_TEXT.gender}
          name="gender"
          options={withNone(PROFILE_TEXT.notGiven, GENDER_OPTIONS)}
          defaultValue={profile.gender}
          isOptional
          errors={errors.gender}
        />
        <SelectField
          label={PROFILE_TEXT.maritalStatus}
          name="maritalStatus"
          options={withNone(PROFILE_TEXT.notGiven, MARITAL_STATUS_OPTIONS)}
          defaultValue={profile.maritalStatus}
          isOptional
          errors={errors.maritalStatus}
        />
        <TextField
          label={PROFILE_TEXT.nationality}
          name="nationality"
          autoComplete="off"
          defaultValue={profile.nationality}
          isOptional
          errors={errors.nationality}
        />
      </div>
    );
  },
  read: (form) => ({
    name: readField(form, "name"),
    dateOfBirth: readField(form, "dateOfBirth"),
    gender: readField(form, "gender"),
    maritalStatus: readField(form, "maritalStatus"),
    nationality: readField(form, "nationality"),
  }),
};

export const CONTACT_EDIT: SectionEdit = {
  Fields: ({ profile, errors }) => (
    <div className={GRID}>
      <TextField
        label={LABELS.mobileNumber}
        name="phone"
        type="tel"
        autoComplete="off"
        placeholder={LABELS.phonePlaceholder}
        defaultValue={profile.phone}
        errors={errors.phone}
      />
      <TextField
        label={LABELS.email}
        name="email"
        type="email"
        autoComplete="off"
        defaultValue={profile.email}
        isOptional
        errors={errors.email}
      />
    </div>
  ),
  read: (form) => ({ phone: readField(form, "phone"), email: readField(form, "email") }),
};

export const FAMILY_EDIT: SectionEdit = {
  Fields: ({ profile, errors }) => (
    <>
      <div className={GRID}>
        <OptionalText
          name="fatherName"
          label={PROFILE_TEXT.fathersName}
          profile={profile}
          errors={errors}
        />
        <OptionalText
          name="motherName"
          label={PROFILE_TEXT.mothersName}
          profile={profile}
          errors={errors}
        />
        <OptionalText
          name="guardianName"
          label={PROFILE_TEXT.guardiansName}
          profile={profile}
          errors={errors}
        />
        <OptionalText
          name="guardianRelation"
          label={PROFILE_TEXT.relation}
          placeholder={PROFILE_TEXT.relationPlaceholder}
          profile={profile}
          errors={errors}
        />
        <TextField
          label={PROFILE_TEXT.guardiansMobile}
          name="guardianPhone"
          type="tel"
          autoComplete="off"
          placeholder={LABELS.phonePlaceholder}
          defaultValue={profile.guardianPhone}
          isOptional
          errors={errors.guardianPhone}
        />
      </div>
      <p className="text-small text-ink-2">{PROFILE_TEXT.familyHint}</p>
    </>
  ),
  read: (form) => ({
    fatherName: readField(form, "fatherName"),
    motherName: readField(form, "motherName"),
    guardianName: readField(form, "guardianName"),
    guardianRelation: readField(form, "guardianRelation"),
    guardianPhone: readField(form, "guardianPhone"),
  }),
};

export const PASSPORT_EDIT: SectionEdit = {
  Fields: function PassportFields({ profile, errors }: SectionFieldsProps) {
    const dates = useDates();
    return (
      <>
        <div className={GRID}>
          <OptionalText
            name="passportNumber"
            label={LABELS.passportNumber}
            profile={profile}
            errors={errors}
          />
          <OptionalText
            name="passportPlaceOfIssue"
            label={PROFILE_TEXT.placeOfIssue}
            placeholder={PROFILE_TEXT.placeOfIssuePlaceholder}
            profile={profile}
            errors={errors}
          />
          <DateField
            label={PROFILE_TEXT.issuedOn}
            name="passportIssueDate"
            display={dates.display}
            max={todayIso()}
            defaultValue={profile.passportIssueDate ?? ""}
            isOptional
            errors={errors.passportIssueDate}
          />
          <DateField
            label={PROFILE_TEXT.expiresOn}
            name="passportExpiryDate"
            display={dates.display}
            defaultValue={profile.passportExpiryDate ?? ""}
            isOptional
            errors={errors.passportExpiryDate}
          />
        </div>
        <p className="text-small text-ink-2">{PROFILE_TEXT.passportHint}</p>
      </>
    );
  },
  read: (form) => ({
    passportNumber: readField(form, "passportNumber"),
    passportPlaceOfIssue: readField(form, "passportPlaceOfIssue"),
    passportIssueDate: readField(form, "passportIssueDate"),
    passportExpiryDate: readField(form, "passportExpiryDate"),
  }),
};

type OptionalTextProps = SectionFieldsProps & {
  name:
    | "fatherName"
    | "motherName"
    | "guardianName"
    | "guardianRelation"
    | "passportNumber"
    | "passportPlaceOfIssue"
    | "pastDegree"
    | "preferredCourse";
  label: string;
  placeholder?: string | undefined;
};

/** An optional one-line detail of the Student, filled with what is stored. */
function OptionalText({ name, label, placeholder, profile, errors }: OptionalTextProps) {
  return (
    <TextField
      label={label}
      name={name}
      autoComplete="off"
      {...(placeholder === undefined ? {} : { placeholder })}
      defaultValue={profile[name]}
      isOptional
      errors={errors[name]}
    />
  );
}

type AddressKind = "permanentAddress" | "mailingAddress";

export const ADDRESSES_EDIT: SectionEdit = {
  Fields: function AddressFields({ profile, errors }: SectionFieldsProps) {
    const [isSame, setIsSame] = useState(profile.mailingSameAsPermanent);
    return (
      <>
        <FormGroup legend={PROFILE_TEXT.permanentAddress}>
          <AddressParts
            kind="permanentAddress"
            address={profile.permanentAddress}
            errors={errors}
          />
        </FormGroup>
        <CheckboxField
          label={PROFILE_TEXT.mailingIsSame}
          name="mailingSameAsPermanent"
          isChecked={isSame}
          onChange={setIsSame}
        />
        {!isSame && (
          <FormGroup legend={PROFILE_TEXT.mailingAddress}>
            <AddressParts kind="mailingAddress" address={profile.mailingAddress} errors={errors} />
          </FormGroup>
        )}
      </>
    );
  },
  read: (form) => {
    const isSame = form.get("mailingSameAsPermanent") !== null;
    return {
      permanentAddress: readAddress(form, "permanentAddress"),
      mailingSameAsPermanent: isSame,
      // With "Same as permanent" the mailing address is left as it is, never copied.
      ...(isSame ? {} : { mailingAddress: readAddress(form, "mailingAddress") }),
    };
  },
};

type AddressPartsProps = {
  kind: AddressKind;
  address: Address;
  errors: SectionFieldsProps["errors"];
};

/** The parts of one address in Nepal's format; each named like "permanentAddress.ward". */
function AddressParts({ kind, address, errors }: AddressPartsProps) {
  const name = (part: keyof AddressInput) => `${kind}.${part}`;
  return (
    <>
      <SelectField
        label={PROFILE_TEXT.province}
        name={name("province")}
        options={withNone(PROFILE_TEXT.choose, PROVINCE_OPTIONS)}
        defaultValue={address.province}
        isOptional
        errors={errors[name("province")]}
      />
      <TextField
        label={PROFILE_TEXT.district}
        name={name("district")}
        autoComplete="off"
        defaultValue={address.district}
        isOptional
        errors={errors[name("district")]}
      />
      <TextField
        label={PROFILE_TEXT.municipality}
        name={name("municipality")}
        autoComplete="off"
        placeholder={PROFILE_TEXT.municipalityPlaceholder}
        defaultValue={address.municipality}
        isOptional
        errors={errors[name("municipality")]}
      />
      <TextField
        label={PROFILE_TEXT.ward}
        name={name("ward")}
        inputMode="numeric"
        autoComplete="off"
        defaultValue={address.ward === null ? "" : String(address.ward)}
        isOptional
        errors={errors[name("ward")]}
      />
      <div className="tablet:col-span-2">
        <TextField
          label={PROFILE_TEXT.street}
          name={name("street")}
          autoComplete="off"
          defaultValue={address.street}
          isOptional
          errors={errors[name("street")]}
        />
      </div>
    </>
  );
}

function readAddress(form: FormData, kind: AddressKind): AddressInput {
  const part = (name: keyof AddressInput) => readField(form, `${kind}.${name}`).trim();
  return {
    province: part("province"),
    district: part("district"),
    municipality: part("municipality"),
    ward: part("ward"),
    street: part("street"),
  };
}

export const EDUCATION_EDIT: SectionEdit = {
  Fields: ({ profile, errors }) => (
    <div className={GRID}>
      <SelectField
        label={LABELS.highestQualification}
        name="highestQualification"
        options={QUALIFICATION_OPTIONS}
        defaultValue={profile.highestQualification}
        errors={errors.highestQualification}
      />
      <OptionalText
        name="pastDegree"
        label={LABELS.pastDegree}
        placeholder={LABELS.pastDegreePlaceholder}
        profile={profile}
        errors={errors}
      />
    </div>
  ),
  read: (form) => ({
    highestQualification: readField(form, "highestQualification"),
    pastDegree: readField(form, "pastDegree"),
  }),
};

export const PLANS_EDIT: SectionEdit = {
  Fields: function PlansFields({ profile, errors }: SectionFieldsProps) {
    const [country, setCountry] = useState<string>(profile.country);
    const [otherCountries, setOtherCountries] = useState<string[]>(profile.otherCountries);
    const [source, setSource] = useState<string>(profile.source);
    return (
      <div className={GRID}>
        <SelectField
          label={LABELS.wantsToStudyIn}
          name="country"
          options={COUNTRY_OPTIONS}
          value={country}
          onChange={setCountry}
          errors={errors.country}
        />
        <SelectField
          label={PROFILE_TEXT.targetLevel}
          name="targetLevel"
          options={withNone(PROFILE_TEXT.notDecided, TARGET_LEVEL_OPTIONS)}
          defaultValue={profile.targetLevel}
          isOptional
          errors={errors.targetLevel}
        />
        <OptionalText
          name="preferredCourse"
          label={LABELS.preferredCourse}
          profile={profile}
          errors={errors}
        />
        <PreferredIntakeField stored={profile.preferredIntake} errors={errors.preferredIntake} />
        <SelectField
          label={LABELS.howTheyFoundUs}
          name="source"
          options={SOURCE_OPTIONS}
          value={source}
          onChange={setSource}
          errors={errors.source}
        />
        {source === Source.SubAgent && (
          <TextField
            label={LABELS.subAgentName}
            name="subAgentName"
            autoComplete="off"
            placeholder={LABELS.subAgentPlaceholder}
            defaultValue={profile.subAgentName}
            errors={errors.subAgentName}
          />
        )}
        <div className="tablet:col-span-2">
          <CheckboxGroup
            label={LABELS.alsoConsidering}
            name="otherCountries"
            options={COUNTRY_OPTIONS.filter((option) => option.value !== country)}
            values={otherCountries.filter((other) => other !== country)}
            onChange={setOtherCountries}
            isOptional
            errors={errors.otherCountries}
          />
        </div>
      </div>
    );
  },
  read: (form) => {
    const source = readField(form, "source");
    return {
      country: readField(form, "country"),
      otherCountries: form.getAll("otherCountries").filter((value) => typeof value === "string"),
      targetLevel: readField(form, "targetLevel"),
      preferredCourse: readField(form, "preferredCourse"),
      preferredIntake: readField(form, "preferredIntake"),
      source,
      subAgentName: source === Source.SubAgent ? readField(form, "subAgentName") : "",
    };
  },
};
