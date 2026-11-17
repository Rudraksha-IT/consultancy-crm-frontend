"use client";

import { useState } from "react";

import { OpenFileButton } from "@/components/features/documents/OpenFileButton";
import { useDocumentLink } from "@/components/features/documents/useDocumentLink";
import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { useToast } from "@/components/ui/useToast";
import { ApplicationStatus, OFFER_KIND_LABELS, OFFER_TEXT } from "@/constants/applications";
import { VisaStatus } from "@/constants/visas";
import { chooseOffer, type Application, type StudentProfile } from "@/lib/api";
import { formatIntake } from "@/lib/dates";

import { AddOfferLetterDialog } from "./AddOfferLetterDialog";
import { changeFailure } from "./statusSaved";

type OffersSectionProps = {
  profile: StudentProfile;
  onSaved: (profile: StudentProfile) => void;
};

/** The Student's Chosen Offer, if it is still one of their offers. */
export function chosenOfferOf(profile: StudentProfile): Application | undefined {
  return profile.applications.find(
    (application) =>
      application.id === profile.chosenOfferId && application.status === ApplicationStatus.Offer,
  );
}

/** The choice can't change while the Chosen Offer's visa waits for an answer (spec 115). */
function isChoiceLocked(profile: StudentProfile): boolean {
  return profile.visas.some(
    (visa) => visa.applicationId === profile.chosenOfferId && visa.status === VisaStatus.Applied,
  );
}

function footNote(profile: StudentProfile, offers: readonly Application[]): string | null {
  if (profile.chosenOfferId !== null) {
    return isChoiceLocked(profile) ? OFFER_TEXT.locked : OFFER_TEXT.followsChosen;
  }
  return offers.length > 0 ? OFFER_TEXT.chooseOne : null;
}

/**
 * Every offer that has arrived, under the Student's Applications (spec 114-115; prototype
 * #student-1). Their counsellor or an Admin adds an offer letter to an Application waiting for an
 * offer, and picks the one offer the Student goes ahead with: the Chosen Offer.
 */
export function OffersSection({ profile, onSaved }: OffersSectionProps) {
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const waiting = profile.applications.filter((one) => one.status === ApplicationStatus.Applied);
  const canAdd = profile.canChangeApplications && waiting.length > 0;

  async function choose(application: Application): Promise<void> {
    setFailure(null);
    try {
      const saved = await chooseOffer(profile.id, application.id);
      showToast(OFFER_TEXT.goingAhead(application.university.name));
      onSaved(saved);
    } catch (error) {
      setFailure(changeFailure(error));
    }
  }

  return (
    <Section
      title={OFFER_TEXT.title}
      aside={
        canAdd && (
          <Button
            icon="plus"
            onClick={() => {
              setIsAdding(true);
            }}
          >
            {OFFER_TEXT.add}
          </Button>
        )
      }
    >
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
      <OfferList
        profile={profile}
        onChoose={(offer) => {
          void choose(offer);
        }}
      />
      {isAdding && (
        <AddOfferLetterDialog
          profile={profile}
          applications={waiting}
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

type OfferListProps = {
  profile: StudentProfile;
  onChoose: (offer: Application) => void;
};

/** The offers in their panel, with a line under them saying what the choice does. */
function OfferList({ profile, onChoose }: OfferListProps) {
  const offers = profile.applications.filter((one) => one.status === ApplicationStatus.Offer);
  const note = footNote(profile, offers);
  return (
    <Panel>
      {offers.length === 0 ? (
        <EmptyState>{OFFER_TEXT.none}</EmptyState>
      ) : (
        <RowList label={OFFER_TEXT.title}>
          {offers.map((offer) => (
            <OfferRow
              key={offer.id}
              profile={profile}
              offer={offer}
              onChoose={() => {
                onChoose(offer);
              }}
            />
          ))}
        </RowList>
      )}
      {note !== null && <PanelFoot>{note}</PanelFoot>}
    </Panel>
  );
}

type OfferRowProps = {
  profile: StudentProfile;
  offer: Application;
  /** Makes it the Chosen Offer; offered only to someone who may change the Student. */
  onChoose: () => void;
};

function OfferRow({ profile, offer, onChoose }: OfferRowProps) {
  const dates = useDates();
  const isChosen = offer.id === profile.chosenOfferId;
  const canChoose = profile.canChangeApplications && !isChosen;
  return (
    <RowItem
      isMarked={isChosen}
      title={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {offer.university.name}
          {isChosen && (
            <Chip tone="good" icon="check">
              {OFFER_TEXT.chosen}
            </Chip>
          )}
        </span>
      }
      meta={OFFER_TEXT.details(
        offer.course.name,
        formatIntake(offer.intake),
        offerWords(offer, dates.date),
      )}
      right={canChoose && <GoAheadButton profile={profile} offer={offer} onChoose={onChoose} />}
    >
      {offer.offerLetter !== null && (
        <LetterLink studentId={profile.id} letter={offer.offerLetter} />
      )}
    </RowItem>
  );
}

/**
 * "Go ahead with this": the main action while no offer is chosen; it can't be used while the
 * Chosen Offer's visa waits for an answer. Screen readers also hear which offer.
 */
function GoAheadButton({ profile, offer, onChoose }: OfferRowProps) {
  return (
    <Button
      variant={profile.chosenOfferId === null ? "primary" : "secondary"}
      isDisabled={isChoiceLocked(profile)}
      onClick={onChoose}
    >
      <span aria-hidden="true">{OFFER_TEXT.goAhead}</span>
      <span className="sr-only">{OFFER_TEXT.goAheadWith(offer.university.name)}</span>
    </Button>
  );
}

/** "Conditional offer, 10 Oct 2026"; less when the kind or day isn't known (older offers). */
function offerWords(offer: Application, showDate: (day: string) => string): string {
  if (offer.offer_kind === "") return OFFER_TEXT.plain;
  const kind = OFFER_KIND_LABELS[offer.offer_kind];
  if (offer.offeredOn === null) return OFFER_TEXT.kindOnly(kind);
  return OFFER_TEXT.kindOn(kind, showDate(offer.offeredOn));
}

/** The offer letter's files, each opening through a short-lived link (spec 70; issue 78). */
function LetterLink({
  studentId,
  letter,
}: {
  studentId: number;
  letter: NonNullable<Application["offerLetter"]>;
}) {
  const { show, failure } = useDocumentLink(studentId);
  return (
    <div className="mt-1 grid gap-2">
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
      <div className="text-secondary flex flex-wrap gap-x-4">
        {letter.files.map((file) => (
          <OpenFileButton
            key={file.id}
            fileName={file.fileName}
            onOpen={() => {
              void show(letter.id, file.id, "open");
            }}
          />
        ))}
      </div>
    </div>
  );
}
