"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { addDocumentType, InvalidFieldsError, type ConfiguredDocumentType } from "@/lib/api";

/**
 * Add a Document Type, needed by every Student or asked for only when needed (spec 63). Its
 * usual Document Group has no field: the server makes it Applying (issue 97).
 */
export function AddDocumentTypeForm({
  onAdded,
}: {
  onAdded: (added: ConfiguredDocumentType) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [isForEveryone, setIsForEveryone] = useState(false);
  const [nameErrors, setNameErrors] = useState<string[] | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function add(trimmed: string): Promise<void> {
    setIsSaving(true);
    try {
      const added = await addDocumentType(trimmed, isForEveryone);
      onAdded(added);
      setName("");
      setIsForEveryone(false);
      showToast(
        added.neededByEveryone ? DOCUMENT_TEXT.addedForEveryone : DOCUMENT_TEXT.addedOptional,
      );
    } catch (error: unknown) {
      if (error instanceof InvalidFieldsError) {
        const refused: Partial<Record<string, string[]>> = error.fieldErrors;
        setNameErrors(refused.name);
      } else {
        setFailure(DOCUMENT_TEXT.saveFailed);
      }
    }
    // The form stays on the page, so it is ready for the next one either way.
    setIsSaving(false);
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = name.trim();
    setFailure(null);
    setNameErrors(trimmed === "" ? [DOCUMENT_TEXT.enterName] : undefined);
    if (trimmed !== "") void add(trimmed);
  }

  return (
    <Panel isPadded>
      <form noValidate onSubmit={submit} className="grid gap-4">
        <TextField
          label={DOCUMENT_TEXT.addName}
          name="document_type_name"
          placeholder={DOCUMENT_TEXT.addNameHint}
          value={name}
          onChange={setName}
          errors={nameErrors}
        />
        <label className="min-h-control text-body inline-flex cursor-pointer items-center gap-3 justify-self-start">
          <input
            type="checkbox"
            checked={isForEveryone}
            onChange={(event) => {
              setIsForEveryone(event.target.checked);
            }}
            className="accent-accent size-5"
          />
          {DOCUMENT_TEXT.everyStudentNeedsIt}
        </label>
        {failure !== null && <Banner tone="problem">{failure}</Banner>}
        <div>
          <Button type="submit" icon="plus" isLoading={isSaving}>
            {DOCUMENT_TEXT.add}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
