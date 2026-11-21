"use client";

import type { RecordId } from "@/lib/recordId";
import { useId, useRef, useState, type SubmitEvent } from "react";

import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/useToast";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { MESSAGES } from "@/constants/messages";
import {
  addPickedDocumentType,
  InvalidFieldsError,
  requirementRefusal,
  type DocumentType,
} from "@/lib/api";
import { tidyDocumentName, PICKED_NAME_MAX_LENGTH } from "@/lib/documents";

import { usePickableTypes, type PickableTypesState } from "./usePickableTypes";

type DocumentPickerDialogProps = {
  title: string;
  /** Who will be asked for the ticked documents. */
  lead: string;
  /** The types already asked for, ticked at the start. */
  initialIds: readonly RecordId[];
  onClose: () => void;
  /** Save the ticked types' ids (in the office's order); a rejection is shown in the dialog. */
  onSave: (ids: RecordId[]) => Promise<void>;
};

/**
 * Choose the extra documents a University, a Course or one Student asks for (spec 63a-63c):
 * a tick box per document not every Student needs, and a field to add one not on the list.
 */
export function DocumentPickerDialog(props: DocumentPickerDialogProps) {
  const { title, lead, initialIds, onClose, onSave } = props;
  const formId = useId();
  const picker = usePickableTypes(initialIds);
  const { isSaving, failure, save } = useFormSave(saveFailure);

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const ids = picker.tickedIds();
    void save(() => onSave(ids));
  }

  return (
    <SaveDialog
      title={title}
      formId={formId}
      saveLabel={DOCUMENT_TEXT.pickerSave}
      isSaving={isSaving}
      isSaveDisabled={picker.state.status !== "loaded"}
      failure={failure}
      onClose={onClose}
    >
      <p className="text-ink-2">{lead}</p>
      <form id={formId} noValidate onSubmit={submit}>
        <Choices
          state={picker.state}
          ticked={picker.ticked}
          onChange={(ids) => {
            picker.tickOnly(ids);
          }}
        />
      </form>
      <AddTypeForm
        types={picker.state.status === "loaded" ? picker.state.types : []}
        onTick={picker.tick}
        onAdded={picker.keepTicked}
      />
    </SaveDialog>
  );
}

function saveFailure(error: unknown): string {
  return requirementRefusal(error) ?? DOCUMENT_TEXT.saveFailed;
}

type ChoicesProps = {
  state: PickableTypesState;
  ticked: ReadonlySet<RecordId>;
  onChange: (ids: RecordId[]) => void;
};

/** A tick box for each document not every Student needs. */
function Choices({ state, ticked, onChange }: ChoicesProps) {
  if (state.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{DOCUMENT_TEXT.typesFailed}</Banner>;
  const offered = state.types.filter((type) => !type.neededByEveryone);
  if (offered.length === 0) return <p className="text-ink-2">{DOCUMENT_TEXT.pickerNone}</p>;
  return (
    <CheckboxGroup
      label={DOCUMENT_TEXT.pickerChoices}
      name="document_types"
      options={offered.map((type) => ({ value: type.id, label: type.name }))}
      values={offered.filter((type) => ticked.has(type.id)).map((type) => type.id)}
      onChange={(values) => {
        onChange(values);
      }}
    />
  );
}

type AddTypeFormProps = {
  /** Every type of the office, those every Student needs included. */
  types: readonly DocumentType[];
  onTick: (id: RecordId) => void;
  onAdded: (added: DocumentType) => void;
};

/**
 * "Something not on the list": adds the name as a document asked for only when needed and ticks
 * it, without closing the dialog. A name already there (in any case) is ticked instead (spec 63c).
 */
function AddTypeForm({ types, onTick, onAdded }: AddTypeFormProps) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<readonly string[] | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);

  function done(message: string): void {
    setName("");
    setErrors(undefined);
    showToast(message);
    formRef.current?.querySelector("input")?.focus();
  }

  function add(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const wanted = tidyDocumentName(name);
    const problem = nameProblem(wanted, types);
    const same = sameName(wanted, types);
    if (problem !== null) {
      setErrors([problem]);
    } else if (same === undefined) {
      void addNew(wanted);
    } else {
      onTick(same.id);
      done(DOCUMENT_TEXT.pickerAlreadyThere(same.name));
    }
  }

  async function addNew(wanted: string): Promise<void> {
    setIsAdding(true);
    try {
      const added = await addPickedDocumentType(wanted);
      onAdded(added);
      done(DOCUMENT_TEXT.pickerAdded(added.name));
    } catch (error) {
      setErrors(nameRefusal(error));
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={add}>
      <Field label={DOCUMENT_TEXT.pickerNewName} hint={DOCUMENT_TEXT.pickerHint} errors={errors}>
        {(control) => (
          <div className="flex items-center gap-3">
            <input
              {...control}
              required={false}
              type="text"
              name="new_document"
              maxLength={PICKED_NAME_MAX_LENGTH}
              placeholder={DOCUMENT_TEXT.pickerPlaceholder}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
            <Button type="submit" icon="plus" isLoading={isAdding}>
              {DOCUMENT_TEXT.pickerAdd}
            </Button>
          </div>
        )}
      </Field>
    </form>
  );
}

/** The server's refusal of the name, or that the add failed. */
function nameRefusal(error: unknown): readonly string[] {
  const refused = error instanceof InvalidFieldsError ? error.fieldErrors.name : undefined;
  return Array.isArray(refused) ? refused : [DOCUMENT_TEXT.saveFailed];
}

/** Why the name can't be added or ticked, if it can't. */
function nameProblem(name: string, types: readonly DocumentType[]): string | null {
  if (name === "") return DOCUMENT_TEXT.pickerTypeFirst;
  if (name.length > PICKED_NAME_MAX_LENGTH) return DOCUMENT_TEXT.pickerTooLong;
  const same = sameName(name, types);
  return same?.neededByEveryone === true ? DOCUMENT_TEXT.pickerEveryone(same.name) : null;
}

function sameName(name: string, types: readonly DocumentType[]): DocumentType | undefined {
  const wanted = name.toLowerCase();
  return types.find((type) => tidyDocumentName(type.name).toLowerCase() === wanted);
}
