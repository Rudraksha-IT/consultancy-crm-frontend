"use client";

import { useState } from "react";

import { CourseBrochures } from "@/components/features/catalogue/CourseBrochures";
import { canMessageStudents } from "@/components/features/communication/canMessage";
import { EmailComposer } from "@/components/features/communication/EmailComposer";
import { firstNameOf } from "@/components/features/communication/recipients";
import type { StartWith } from "@/components/features/communication/useComposerText";
import { LinkedDocuments } from "@/components/features/documents/LinkedDocuments";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { APPLICATION_STATUS_TONES } from "@/components/features/applications/statusTones";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/useToast";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_TEXT,
  ApplicationStatus,
  STATUSES_BY_HAND,
  applicationStatusText,
  type StatusByHand,
} from "@/constants/applications";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { changeApplicationStatus, type Application, type StudentProfile } from "@/lib/api";
import { formatIntake } from "@/lib/dates";

import { AddApplicationDialog } from "./AddApplicationDialog";
import { OffersSection } from "./OffersSection";
import { changeFailure, statusSavedMessage } from "./statusSaved";
import { VisasSection } from "./VisasSection";

// Offer is never picked by hand: adding an offer letter sets it (issue 74).
const STATUS_OPTIONS = STATUSES_BY_HAND.map((status) => ({
  value: status,
  label: APPLICATION_STATUS_LABELS[status],
}));

type ApplicationsTabProps = {
  profile: StudentProfile;
  onSaved: (profile: StudentProfile) => void;
};

/**
 * Every Application of the Student and its Status (spec 52-57), the offers that came in and the
 * Chosen Offer (spec 114-115), then their Visas (spec 58-62). Their counsellor or an Admin adds
 * Applications and offer letters, chooses the offer, applies for the Visa and changes Statuses;
 * the Stage follows on the server.
 */
export function ApplicationsTab({ profile, onSaved }: ApplicationsTabProps) {
  return (
    <>
      <ApplicationsSection profile={profile} onSaved={onSaved} />
      <OffersSection profile={profile} onSaved={onSaved} />
      <VisasSection profile={profile} onSaved={onSaved} />
    </>
  );
}

function ApplicationsSection({ profile, onSaved }: ApplicationsTabProps) {
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [emailing, setEmailing] = useState<Application | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const canChange = profile.canChangeApplications;

  async function changeStatus(application: Application, status: StatusByHand): Promise<void> {
    setFailure(null);
    try {
      const saved = await changeApplicationStatus(profile.id, application.id, status);
      const done = APPLICATION_TEXT.statusSaved(
        application.university.name,
        APPLICATION_STATUS_LABELS[status],
      );
      showToast(statusSavedMessage(done, profile.stage, saved.stage));
      onSaved(saved);
    } catch (error) {
      setFailure(changeFailure(error));
    }
  }

  return (
    <Section
      title={APPLICATION_TEXT.title}
      aside={
        canChange && (
          <Button
            icon="plus"
            onClick={() => {
              setIsAdding(true);
            }}
          >
            {APPLICATION_TEXT.add}
          </Button>
        )
      }
    >
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
      <Panel>
        {profile.applications.length === 0 ? (
          <EmptyState>{APPLICATION_TEXT.none}</EmptyState>
        ) : (
          <RowList label={APPLICATION_TEXT.title}>
            {profile.applications.map((application) => (
              <RowItem
                key={application.id}
                title={application.university.name}
                meta={APPLICATION_TEXT.starting(
                  application.course.name,
                  formatIntake(application.intake),
                )}
                right={
                  canChange && application.status !== ApplicationStatus.Offer ? (
                    <SelectField
                      label={APPLICATION_TEXT.statusOf(application.university.name)}
                      isLabelHidden
                      name={`status-${String(application.id)}`}
                      options={STATUS_OPTIONS}
                      value={application.status}
                      onChange={(value) => {
                        const status = STATUSES_BY_HAND.find((known) => known === value);
                        if (status !== undefined) void changeStatus(application, status);
                      }}
                    />
                  ) : (
                    <StatusChip application={application} />
                  )
                }
              >
                <LinkedDocuments
                  studentId={profile.id}
                  record={application.university.name}
                  documents={application.documents}
                />
                <ApplicationBrochures
                  application={application}
                  profile={profile}
                  onEmail={() => {
                    setEmailing(application);
                  }}
                />
              </RowItem>
            ))}
          </RowList>
        )}
      </Panel>
      <BrochuresComposer
        emailing={emailing}
        profile={profile}
        onClose={() => {
          setEmailing(null);
        }}
        onSent={() => {
          setEmailing(null);
          onSaved(profile);
        }}
      />
      {isAdding && (
        <AddApplicationDialog
          profile={profile}
          onClose={() => {
            setIsAdding(false);
          }}
          onSaved={(saved) => {
            setIsAdding(false);
            onSaved(saved);
          }}
        />
      )}
    </Section>
  );
}

type ApplicationBrochuresProps = {
  application: Application;
  profile: StudentProfile;
  onEmail: () => void;
};

/** The Course's brochures under an Application, with "Email it to" for a Student with an email. */
function ApplicationBrochures({ application, profile, onEmail }: ApplicationBrochuresProps) {
  const canEmail = canMessageStudents(useCurrentStaff()) && profile.email !== "";
  return (
    <CourseBrochures
      courseName={application.course.name}
      files={application.courseFiles}
      email={canEmail ? { firstName: firstNameOf(profile.name), onEmail } : undefined}
    />
  );
}

type BrochuresComposerProps = {
  /** The Application whose brochures are being emailed, or null while none is. */
  emailing: Application | null;
  profile: StudentProfile;
  onClose: () => void;
  onSent: () => void;
};

function BrochuresComposer({ emailing, profile, onClose, onSent }: BrochuresComposerProps) {
  if (emailing === null) return null;
  return (
    <EmailComposer
      recipients={[profile]}
      isBulk={false}
      startWith={brochuresEmail(emailing)}
      onClose={onClose}
      onSent={onSent}
    />
  );
}

/**
 * "Email it to <first name>" (ticket 10): the Plain email about the Course's brochures. The files
 * are attached once emails carry attachments (ticket 12).
 */
function brochuresEmail(application: Application): StartWith {
  const { course, university, courseFiles } = application;
  return {
    kind: "plain",
    text: {
      subject: CATALOGUE_TEXT.brochureSubject(course.name, university.name),
      line: CATALOGUE_TEXT.brochureLine(courseFiles.length, course.name, university.name),
    },
  };
}

/** An Application's Status as a chip: "Offer, conditional" when the kind of offer is known. */
function StatusChip({ application }: { application: Application }) {
  return (
    <Chip tone={APPLICATION_STATUS_TONES[application.status]}>
      {applicationStatusText(application.status, application.offer_kind)}
    </Chip>
  );
}
