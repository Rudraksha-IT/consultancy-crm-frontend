"use client";

import type { RecordId } from "@/lib/recordId";
import { useCallback, useState, type ReactNode, type SubmitEvent } from "react";

import { useLoaded } from "@/components/features/home/useLoaded";
import { useDates } from "@/components/features/shell/dateDisplay";
import { PaymentFlow } from "@/components/features/students/profile/ProfileHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { NoteCard } from "@/components/ui/NoteCard";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { Loading } from "@/components/ui/Loading";
import { HOME_TEXT } from "@/constants/home";
import { LABELS, MESSAGES } from "@/constants/messages";
import { PAYMENT_TEXT } from "@/constants/payments";
import { ROUTES } from "@/constants/routes";
import { STAGE_LABELS } from "@/constants/stages";
import { COUNTRY_LABELS } from "@/constants/students";
import {
  VISIT_REASON_LABELS,
  VISIT_REASONS,
  VISIT_TEXT,
  VisitReason,
  type VisitReason as Reason,
} from "@/constants/visits";
import {
  fetchStudentProfile,
  fetchStudentProgress,
  fetchStudentVisits,
  InvalidFieldsError,
  logVisit,
  type NewVisitField,
  type StudentProfile,
  type StudentProgress,
  type Visit,
} from "@/lib/api";

const REASON_OPTIONS = VISIT_REASONS.map((value) => ({
  value,
  label: VISIT_REASON_LABELS[value],
}));

type Picked = { profile: StudentProfile; progress: StudentProgress; lastVisit: Visit | null };

async function loadPicked(studentId: RecordId): Promise<Picked> {
  const [profile, progress, visits] = await Promise.all([
    fetchStudentProfile(studentId),
    fetchStudentProgress(studentId),
    fetchStudentVisits(studentId, 1),
  ]);
  return { profile, progress, lastVisit: visits.visits[0] ?? null };
}

type ReturningVisitorProps = {
  studentId: RecordId;
  onChooseAnother: () => void;
  onLogged: () => void;
};

/**
 * The returning visitor Front Desk picked: who they are, how far along, their last Visit and Note,
 * and the form that logs today's Visit (spec 23a). A payment can be taken from here too.
 */
export function ReturningVisitor({ studentId, onChooseAnother, onLogged }: ReturningVisitorProps) {
  const load = useCallback(() => loadPicked(studentId), [studentId]);
  const state = useLoaded(load, 0);

  if (state.status === "loading") {
    return (
      <Panel isPadded>
        <Loading />
      </Panel>
    );
  }
  if (state.status === "failed") {
    return (
      <Panel isPadded>
        <Banner tone="problem">{VISIT_TEXT.visitorFailed}</Banner>
        <div>
          <Button onClick={onChooseAnother}>{VISIT_TEXT.chooseSomeoneElse}</Button>
        </div>
      </Panel>
    );
  }
  return <VisitorCard picked={state.data} onChooseAnother={onChooseAnother} onLogged={onLogged} />;
}

type VisitorCardProps = {
  picked: Picked;
  onChooseAnother: () => void;
  onLogged: () => void;
};

function VisitorCard({ picked, onChooseAnother, onLogged }: VisitorCardProps) {
  const { profile, progress, lastVisit } = picked;
  const [isPaying, setIsPaying] = useState(false);
  return (
    <Panel isPadded>
      <VisitorHead profile={profile} onChooseAnother={onChooseAnother} />
      <ProgressBlock name={profile.name} progress={progress} />
      {lastVisit !== null && <LastVisit visit={lastVisit} />}
      <NoteCard title={LABELS.note}>
        <p className="max-w-prose whitespace-pre-wrap">
          {profile.note === "" ? (
            <span className="text-ink-2">{MESSAGES.nothingWrittenYet}</span>
          ) : (
            profile.note
          )}
        </p>
      </NoteCard>
      <VisitForm
        studentId={profile.id}
        onLogged={onLogged}
        payment={
          profile.canRecordPayment && (
            <Button
              icon="receipt"
              onClick={() => {
                setIsPaying(true);
              }}
            >
              {PAYMENT_TEXT.takeAPayment}
            </Button>
          )
        }
      />
      {isPaying && (
        <PaymentFlow
          profile={profile}
          onClose={() => {
            setIsPaying(false);
          }}
          onRecorded={() => undefined}
        />
      )}
    </Panel>
  );
}

type VisitorHeadProps = { profile: StudentProfile; onChooseAnother: () => void };

/** Who they are: name, mobile, the country they want, their counsellor; and where to go next. */
function VisitorHead({ profile, onChooseAnother }: VisitorHeadProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar name={profile.name} size="lg" />
        <div className="grid min-w-0 gap-1">
          <h2 className="text-section-title break-words">{profile.name}</h2>
          <p className="text-secondary text-ink-2 flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Icon name="phone" size="sm" />
              {profile.phone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="plane" size="sm" />
              {COUNTRY_LABELS[profile.country]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="users" size="sm" />
              {profile.assignedCounsellor?.name ?? VISIT_TEXT.noCounsellorYet}
            </span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={ROUTES.student(profile.id)}>{VISIT_TEXT.openTheirPage}</ButtonLink>
        <Button variant="ghost" onClick={onChooseAnother}>
          {VISIT_TEXT.chooseSomeoneElse}
        </Button>
      </div>
    </div>
  );
}

/** Their Stage, how far along they are, and the next step. */
function ProgressBlock({ name, progress }: { name: string; progress: StudentProgress }) {
  return (
    <div className="grid gap-2">
      <b>{STAGE_LABELS[progress.stage]}</b>
      <ProgressBar label={VISIT_TEXT.progressLabel(name)} value={progress.percent} />
      <p className="text-ink-2">
        {progress.isDone ? HOME_TEXT.done(progress.nextStep) : HOME_TEXT.next(progress.nextStep)}
      </p>
    </div>
  );
}

function LastVisit({ visit }: { visit: Visit }) {
  const dates = useDates();
  return (
    <p className="text-ink-2">{VISIT_TEXT.lastVisit(dates.dateTime(visit.at), visit.purpose)}</p>
  );
}

type VisitFormProps = {
  studentId: RecordId;
  onLogged: () => void;
  payment: ReactNode;
};

/** Why they are here today and any details; saving logs a Follow-up Visit. */
function VisitForm({ studentId, onLogged, payment }: VisitFormProps) {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<NewVisitField, string[]>>>({});
  const [error, setError] = useState<string | null>(null);

  async function save(reason: Reason, details: string): Promise<void> {
    setIsSaving(true);
    setFieldErrors({});
    setError(null);
    try {
      await logVisit(studentId, { reason, details });
      showToast(VISIT_TEXT.visitSaved);
      onLogged();
    } catch (caught) {
      if (caught instanceof InvalidFieldsError) setFieldErrors(caught.fieldErrors);
      else setError(VISIT_TEXT.saveVisitFailed);
      setIsSaving(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = form.get("reason");
    const details = form.get("details");
    void save(
      isReason(reason) ? reason : VisitReason.Other,
      typeof details === "string" ? details : "",
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="border-rule grid gap-5 border-t pt-5">
      <div className="tablet:grid-cols-2 grid gap-5">
        <SelectField
          label={VISIT_TEXT.whyHere}
          name="reason"
          options={REASON_OPTIONS}
          defaultValue={VisitReason.CounsellingSession}
          errors={fieldErrors.reason}
        />
        <TextField
          label={VISIT_TEXT.details}
          name="details"
          autoComplete="off"
          placeholder={VISIT_TEXT.detailsPlaceholder}
          isOptional
          errors={fieldErrors.details}
        />
      </div>
      {error !== null && <Banner tone="problem">{error}</Banner>}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon="check"
          isLoading={isSaving}
          loadingLabel={LABELS.saving}
        >
          {VISIT_TEXT.saveVisit}
        </Button>
        {payment}
      </div>
    </form>
  );
}

function isReason(value: unknown): value is Reason {
  return VISIT_REASONS.some((reason) => reason === value);
}
