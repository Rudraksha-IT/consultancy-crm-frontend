"use client";

import { useState } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { LinkedDocuments } from "@/components/features/documents/LinkedDocuments";
import { Banner } from "@/components/ui/Banner";
import { VISA_STATUS_TONES } from "@/components/features/visas/statusTones";
import { formatAppointment } from "@/components/features/visas/appointmentWhen";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/useToast";
import { DOCUMENT_TEXT } from "@/constants/documents";
import {
  APPOINTMENTS,
  APPOINTMENT_LABELS,
  VISA_STATUSES,
  VISA_STATUS_LABELS,
  VISA_TEXT,
  VisaStatus,
} from "@/constants/visas";
import {
  changeVisaStatus,
  startVisa,
  type Application,
  type StudentProfile,
  type Visa,
} from "@/lib/api";

import { chosenOfferOf } from "./OffersSection";
import { VisaDatesDialog } from "./VisaDatesDialog";
import { VisaLetterDialog } from "./VisaLetterDialog";
import { changeFailure, statusSavedMessage } from "./statusSaved";

const STATUS_OPTIONS = VISA_STATUSES.map((status) => ({
  value: status,
  label: VISA_STATUS_LABELS[status],
}));

type VisasSectionProps = {
  profile: StudentProfile;
  onSaved: (profile: StudentProfile) => void;
};

/**
 * The Chosen Offer's visa can be marked as applied while no Visa of the Student waits for an
 * answer and that offer's visa isn't granted (spec 58; issues 75 and 76).
 */
function offerToApplyFor(profile: StudentProfile): Application | null {
  const chosen = chosenOfferOf(profile);
  if (!profile.canChangeApplications || chosen === undefined) return null;
  const isBlocked = profile.visas.some(
    (visa) =>
      visa.status === VisaStatus.Applied ||
      (visa.applicationId === chosen.id && visa.status === VisaStatus.Granted),
  );
  return isBlocked ? null : chosen;
}

/** What the Visa section says before the first Visa: choose an offer, or prepare its papers. */
function noVisaYet(profile: StudentProfile): string {
  const chosen = chosenOfferOf(profile);
  return chosen === undefined ? VISA_TEXT.none : VISA_TEXT.prepareFor(chosen.university.name);
}

/**
 * Every Visa of the Student, newest first, with its Status and appointments (spec 59-62a; issue
 * 75). Their counsellor or an Admin marks the Chosen Offer's visa as applied (issue 76), changes
 * the Status (Applied, Granted or Refused) or uploads the visa letter (issue 77), and books the
 * Biometrics, Medical and Interview of a Visa waiting for an answer; the Stage follows on the
 * server.
 */
export function VisasSection({ profile, onSaved }: VisasSectionProps) {
  const dates = useDates();
  const { showToast } = useToast();
  const [failure, setFailure] = useState<string | null>(null);
  const [datesOf, setDatesOf] = useState<Visa | null>(null);
  const [letterFor, setLetterFor] = useState<Visa | null>(null);
  const canChange = profile.canChangeApplications;
  const toApplyFor = offerToApplyFor(profile);

  async function apply(offer: Application): Promise<void> {
    setFailure(null);
    const university = offer.university.name;
    try {
      const saved = await startVisa(profile.id, offer.id);
      showToast(statusSavedMessage(VISA_TEXT.applied(university), profile.stage, saved.stage));
      onSaved(saved);
    } catch (error) {
      setFailure(changeFailure(error));
    }
  }

  async function changeStatus(visa: Visa, status: VisaStatus): Promise<void> {
    setFailure(null);
    try {
      const saved = await changeVisaStatus(profile.id, visa.id, status);
      const done = VISA_TEXT.statusSaved(visa.university.name, VISA_STATUS_LABELS[status]);
      showToast(statusSavedMessage(done, profile.stage, saved.stage));
      onSaved(saved);
    } catch (error) {
      setFailure(changeFailure(error));
    }
  }

  return (
    <Section
      title={VISA_TEXT.title}
      aside={
        toApplyFor !== null && (
          <Button
            variant="primary"
            icon="send"
            onClick={() => {
              void apply(toApplyFor);
            }}
          >
            <span aria-hidden="true">{VISA_TEXT.apply}</span>
            <span className="sr-only">{VISA_TEXT.applyFor(toApplyFor.university.name)}</span>
          </Button>
        )
      }
    >
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
      <Panel>
        {profile.visas.length === 0 ? (
          <EmptyState>{noVisaYet(profile)}</EmptyState>
        ) : (
          <RowList label={VISA_TEXT.title}>
            {profile.visas.map((visa) => (
              <RowItem
                key={visa.id}
                title={visa.university.name}
                meta={VISA_TEXT.appliedOn(dates.date(visa.startedOn))}
                right={
                  canChange ? (
                    <>
                      {visa.status === VisaStatus.Applied && (
                        <DatesButton
                          visa={visa}
                          onOpen={() => {
                            setDatesOf(visa);
                          }}
                        />
                      )}
                      <LetterButton
                        visa={visa}
                        onOpen={() => {
                          setLetterFor(visa);
                        }}
                      />
                      <SelectField
                        label={VISA_TEXT.statusOf(visa.university.name)}
                        isLabelHidden
                        name={`visa-status-${visa.id}`}
                        options={STATUS_OPTIONS}
                        value={visa.status}
                        onChange={(value) => {
                          const status = VISA_STATUSES.find((known) => known === value);
                          if (status !== undefined) void changeStatus(visa, status);
                        }}
                      />
                    </>
                  ) : (
                    <Chip tone={VISA_STATUS_TONES[visa.status]}>
                      {VISA_STATUS_LABELS[visa.status]}
                    </Chip>
                  )
                }
              >
                <BookedDates visa={visa} />
                <LinkedDocuments
                  studentId={profile.id}
                  record={DOCUMENT_TEXT.theVisa(visa.university.name)}
                  documents={visa.documents}
                />
              </RowItem>
            ))}
          </RowList>
        )}
      </Panel>
      {datesOf !== null && (
        <VisaDatesDialog
          profile={profile}
          visa={datesOf}
          onClose={() => {
            setDatesOf(null);
          }}
          onSaved={(saved, message) => {
            setDatesOf(null);
            if (message !== null) showToast(message);
            if (saved !== null) onSaved(saved);
          }}
        />
      )}
      <LetterDialog
        profile={profile}
        visa={letterFor}
        onClose={() => {
          setLetterFor(null);
        }}
        onSaved={(saved) => {
          setLetterFor(null);
          onSaved(saved);
        }}
      />
    </Section>
  );
}

type LetterDialogProps = Omit<Parameters<typeof VisaLetterDialog>[0], "visa"> & {
  visa: Visa | null;
};

/** The Upload visa letter dialog while one Visa's letter is being added; otherwise nothing. */
function LetterDialog({ visa, ...props }: LetterDialogProps) {
  return visa === null ? null : <VisaLetterDialog visa={visa} {...props} />;
}

/** "Upload visa letter"; screen readers also hear which Visa (spec 116). */
function LetterButton({ visa, onOpen }: { visa: Visa; onOpen: () => void }) {
  return (
    <Button variant="ghost" size="sm" icon="upload" onClick={onOpen}>
      <span aria-hidden="true">{VISA_TEXT.uploadLetter}</span>
      <span className="sr-only">{VISA_TEXT.uploadLetterFor(visa.university.name)}</span>
    </Button>
  );
}

/** Each appointment booked on the Visa, soonest first, e.g. "Biometrics: 4 Nov 2026 at 10:30 AM". */
function BookedDates({ visa }: { visa: Visa }) {
  const dates = useDates();
  const booked = APPOINTMENTS.flatMap((kind) => {
    const at = bookedAt(visa)[kind];
    return at === null ? [] : [{ kind, at }];
  }).sort((first, second) => first.at.localeCompare(second.at));
  if (booked.length === 0) return null;
  return (
    <div className="text-secondary text-ink flex flex-wrap gap-x-4 gap-y-1">
      {booked.map(({ kind, at }) => (
        <p key={kind} className="flex items-center gap-2">
          <Icon name="clock" />
          {VISA_TEXT.appointmentOn(APPOINTMENT_LABELS[kind], formatAppointment(at, dates.date))}
        </p>
      ))}
    </div>
  );
}

function bookedAt(visa: Visa): Record<(typeof APPOINTMENTS)[number], string | null> {
  return { biometrics: visa.biometricsAt, medical: visa.medicalAt, interview: visa.interviewAt };
}

/** "Add dates" or "Change dates"; screen readers also hear which Visa. */
function DatesButton({ visa, onOpen }: { visa: Visa; onOpen: () => void }) {
  const isBooked = Object.values(bookedAt(visa)).some((at) => at !== null);
  const university = visa.university.name;
  return (
    <Button variant="ghost" size="sm" icon="clock" onClick={onOpen}>
      <span aria-hidden="true">{isBooked ? VISA_TEXT.changeDates : VISA_TEXT.addDates}</span>
      <span className="sr-only">
        {isBooked ? VISA_TEXT.changeDatesFor(university) : VISA_TEXT.addDatesFor(university)}
      </span>
    </Button>
  );
}
