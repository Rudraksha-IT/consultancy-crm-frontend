"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import {
  COUNTRY_LIST_TEXT,
  DOCUMENT_GROUP_LABELS,
  DOCUMENT_TEXT,
  type DocumentGroup,
} from "@/constants/documents";
import { LABELS } from "@/constants/messages";
import { COUNTRY_LABELS, type Country } from "@/constants/students";
import {
  addCountryDocument,
  InvalidFieldsError,
  requirementRefusal,
  type NewCountryDocument,
} from "@/lib/api";

const FORM_ID = "new-country-document";

type NewCountryDocumentDialogProps = {
  country: Country;
  /** The list being viewed: the new document goes on it, and it is its usual group. */
  group: DocumentGroup;
  /** Made and on the list; the dialog is closed by the caller. */
  onMade: (made: NewCountryDocument) => void;
  onClose: () => void;
};

/**
 * "New document for {Country}" (spec 121a; issue 97): just the name. One request makes the
 * Document Type and puts it on the Country's list in the group being viewed, so nothing is left
 * half made. A name already used is refused with words saying where it is, and the dialog stays
 * open.
 */
export function NewCountryDocumentDialog({
  country,
  group,
  onMade,
  onClose,
}: NewCountryDocumentDialogProps) {
  const [name, setName] = useState("");
  const [nameErrors, setNameErrors] = useState<string[] | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const countryLabel = COUNTRY_LABELS[country];
  const groupLabel = DOCUMENT_GROUP_LABELS[group];

  async function make(trimmed: string): Promise<void> {
    setIsSaving(true);
    try {
      onMade(await addCountryDocument(country, trimmed, group));
    } catch (error: unknown) {
      if (error instanceof InvalidFieldsError) {
        const refused: Partial<Record<string, string[]>> = error.fieldErrors;
        setNameErrors(refused.name ?? [DOCUMENT_TEXT.saveFailed]);
      } else {
        setFailure(requirementRefusal(error) ?? DOCUMENT_TEXT.saveFailed);
      }
      setIsSaving(false);
    }
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = name.trim();
    setFailure(null);
    setNameErrors(trimmed === "" ? [DOCUMENT_TEXT.enterName] : undefined);
    if (trimmed !== "") void make(trimmed);
  }

  return (
    <Dialog
      isOpen
      title={COUNTRY_LIST_TEXT.newTitle(countryLabel)}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <Button type="submit" form={FORM_ID} variant="primary" isLoading={isSaving}>
            {COUNTRY_LIST_TEXT.createAndAdd}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="grid gap-4">
        {failure !== null && <Banner tone="problem">{failure}</Banner>}
        <TextField
          label={COUNTRY_LIST_TEXT.newName}
          name="document_name"
          autoComplete="off"
          placeholder={COUNTRY_LIST_TEXT.newNameHint}
          value={name}
          onChange={setName}
          errors={nameErrors}
        />
        <p className="text-small text-ink-2">
          {COUNTRY_LIST_TEXT.newExplained(countryLabel, groupLabel)}
        </p>
      </form>
    </Dialog>
  );
}
