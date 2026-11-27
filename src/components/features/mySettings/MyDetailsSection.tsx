"use client";

import { useState, type SubmitEvent } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { useSetMyName } from "@/components/features/shell/myName";
import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { LABELS } from "@/constants/messages";
import { MY_SETTINGS_TEXT as TEXT } from "@/constants/mySettings";
import { ROLE_LABELS } from "@/constants/roles";
import { InvalidFieldsError, saveMyDetails, type MyDetails, type MyDetailsField } from "@/lib/api";
import { LABEL_CLASSES } from "@/components/ui/Field";

type MyDetailsSectionProps = {
  details: MyDetails;
  onSaved: (details: MyDetails) => void;
};

/** My Details: who I am to the office. Only my name and mobile are mine to change (spec 22d). */
export function MyDetailsSection({ details, onSaved }: MyDetailsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  return isEditing ? (
    <DetailsForm
      details={details}
      onCancel={() => {
        setIsEditing(false);
      }}
      onSaved={(saved) => {
        onSaved(saved);
        setIsEditing(false);
      }}
    />
  ) : (
    <DetailsCard
      details={details}
      onEdit={() => {
        setIsEditing(true);
      }}
    />
  );
}

function DetailsCard({ details, onEdit }: { details: MyDetails; onEdit: () => void }) {
  const dates = useDates();
  const role = ROLE_LABELS[details.role];
  const items = [
    { label: TEXT.mobileNumber, value: details.mobile },
    { label: TEXT.workEmail, value: details.email },
    { label: TEXT.joinedOn, value: dates.date(details.joinedOn) },
  ];

  return (
    <Panel>
      <div className="border-rule flex flex-wrap items-center gap-5 border-b p-6">
        <Avatar name={details.name} size="lg" />
        <div className="grid min-w-0 flex-1 basis-48 justify-items-start gap-1">
          <p className="text-card-title wrap-anywhere">{details.name}</p>
          <p className="text-ink-2 wrap-anywhere">
            {details.jobTitle === "" ? role : details.jobTitle}
          </p>
          <Chip tone="accent" hasDot={false}>
            {role}
          </Chip>
        </div>
        <Button icon="edit" onClick={onEdit}>
          {TEXT.editDetails}
        </Button>
      </div>
      <dl className="tablet:grid-cols-3 grid gap-5 p-6">
        {items.map(({ label, value }) => (
          <div key={label} className="grid min-w-0 content-start gap-1">
            <dt className="text-small text-ink-3">{label}</dt>
            <dd className="font-semibold wrap-anywhere tabular-nums">
              {value === "" ? TEXT.none : value}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

type DetailsFormProps = {
  details: MyDetails;
  onCancel: () => void;
  onSaved: (details: MyDetails) => void;
};

type FieldErrors = Partial<Record<MyDetailsField, readonly string[] | undefined>>;

function DetailsForm({ details, onCancel, onSaved }: DetailsFormProps) {
  const setMyName = useSetMyName();
  const { showToast } = useToast();
  const [name, setName] = useState(details.name);
  const [mobile, setMobile] = useState(details.mobile);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setProblem(null);
    if (name.trim() === "") {
      setErrors({ name: [TEXT.enterName] });
      return;
    }
    setErrors({});
    setIsSaving(true);
    try {
      const saved = await saveMyDetails({ name, mobile: mobile.trim() });
      setMyName(saved.name);
      showToast(TEXT.detailsSaved);
      onSaved(saved);
    } catch (error) {
      if (error instanceof InvalidFieldsError) {
        setErrors({ name: error.fieldErrors.name, mobile: error.fieldErrors.mobile });
      } else {
        setProblem(TEXT.saveFailed);
      }
      setIsSaving(false);
    }
  }

  return (
    <Panel isPadded>
      <form noValidate onSubmit={(event) => void save(event)} className="grid gap-5">
        <div className="tablet:grid-cols-2 grid gap-5">
          <TextField
            label={TEXT.fullName}
            name="name"
            autoComplete="name"
            value={name}
            onChange={setName}
            errors={errors.name}
          />
          <TextField
            label={TEXT.mobileNumber}
            name="mobile"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={mobile}
            onChange={setMobile}
            errors={errors.mobile}
            isOptional
          />
        </div>
        <div className="grid gap-1">
          <p className={LABEL_CLASSES}>{TEXT.workEmail}</p>
          <p className="text-ink wrap-anywhere">{TEXT.setByAdmin(details.email)}</p>
        </div>
        {problem !== null && <Banner tone="problem">{problem}</Banner>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button onClick={onCancel}>{LABELS.cancel}</Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {TEXT.saveDetails}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
