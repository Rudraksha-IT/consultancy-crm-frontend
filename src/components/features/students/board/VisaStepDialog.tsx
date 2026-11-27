"use client";

import { useId, useState, type SubmitEvent } from "react";

import { useToast } from "@/components/ui/useToast";
import { ApplicationStatus, OFFER_KIND_LABELS } from "@/constants/applications";
import { BOARD_TEXT } from "@/constants/students";
import { VISA_TEXT } from "@/constants/visas";
import { chooseOffer, startVisa, type Application, type StudentProfile } from "@/lib/api";

import { chosenOfferOf } from "../profile/OffersSection";
import { SaveDialog } from "../profile/SaveDialog";
import { statusSavedMessage } from "../profile/statusSaved";
import { useFormSave } from "../profile/useFormSave";
import { firstNameOf } from "./moveSteps";
import { LABEL_CLASSES } from "@/components/ui/Field";

type VisaStepDialogProps = {
  profile: StudentProfile;
  onClose: () => void;
  /** The Chosen Offer was saved; the visa is still to be applied for. */
  onChosen: (profile: StudentProfile) => void;
  onSaved: (profile: StudentProfile) => void;
};

/** "Master of IT, Conditional offer". */
function offerLine(offer: Application): string {
  const kind = offer.offer_kind === "" ? "" : OFFER_KIND_LABELS[offer.offer_kind];
  return BOARD_TEXT.offerLine(offer.course.name, kind);
}

/** The offer picked to start with: the Chosen Offer, or the first. */
function firstPick(profile: StudentProfile, offers: readonly Application[]): string {
  return (chosenOfferOf(profile) ?? offers[0])?.id ?? "";
}

/**
 * On the way to Visa: which offer the Student goes ahead with, then the visa is applied for
 * (UI revamp 09, prototype `visaPick`). Saving makes it the Chosen Offer, if it isn't yet, and
 * adds the Visa as Applied; the Student's Stage follows on the server.
 */
export function VisaStepDialog({ profile, onClose, onChosen, onSaved }: VisaStepDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const offers = profile.applications.filter((one) => one.status === ApplicationStatus.Offer);
  const [pickedId, setPickedId] = useState(() => firstPick(profile, offers));
  const { isSaving, fieldErrors, failure, save } = useFormSave();

  async function apply(offer: Application): Promise<void> {
    if (profile.chosenOfferId !== offer.id) onChosen(await chooseOffer(profile.id, offer.id));
    const saved = await startVisa(profile.id, offer.id);
    const done = VISA_TEXT.applied(offer.university.name);
    showToast(statusSavedMessage(done, profile.stage, saved.stage));
    onSaved(saved);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const offer = offers.find((one) => one.id === pickedId);
    if (offer !== undefined) void save(() => apply(offer));
  }

  return (
    <SaveDialog
      title={BOARD_TEXT.visaFor(firstNameOf(profile.name))}
      formId={formId}
      saveLabel={BOARD_TEXT.applyForVisa}
      saveIcon="send"
      isSaving={isSaving}
      failure={failure ?? fieldErrors.application?.join(" ") ?? null}
      onClose={onClose}
    >
      <p className="text-ink-2">{BOARD_TEXT.visaHelp}</p>
      <form id={formId} noValidate onSubmit={handleSubmit} className="mt-3">
        <OfferChoices offers={offers} pickedId={pickedId} onPick={setPickedId} />
      </form>
    </SaveDialog>
  );
}

type OfferChoicesProps = {
  offers: readonly Application[];
  pickedId: string;
  onPick: (id: string) => void;
};

/** Each offer as the university in bold, with its course and kind of offer under it. */
function OfferChoices({ offers, pickedId, onPick }: OfferChoicesProps) {
  const legendId = useId();
  return (
    <fieldset role="radiogroup" aria-labelledby={legendId} className="grid min-w-0 gap-1">
      <legend id={legendId} className={`${LABEL_CLASSES} mb-1`}>
        {BOARD_TEXT.goAheadWith}
      </legend>
      {offers.map((offer) => (
        <label
          key={offer.id}
          className="min-h-control rounded-control hover:bg-fill -mx-2 flex cursor-pointer items-start gap-3 px-2 py-2"
        >
          <input
            type="radio"
            name="offer"
            value={offer.id}
            checked={offer.id === pickedId}
            onChange={() => {
              onPick(offer.id);
            }}
            className="accent-accent mt-0.5 size-5 flex-none"
          />
          <span className="grid min-w-0">
            <b className="font-semibold wrap-anywhere">{offer.university.name}</b>
            <span className="text-secondary text-ink-2 wrap-anywhere">{offerLine(offer)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
