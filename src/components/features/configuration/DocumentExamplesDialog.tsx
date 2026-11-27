"use client";

import clsx from "clsx";
import { useId, useRef, useState, type SubmitEvent } from "react";

import { useOpenLink } from "@/components/features/catalogue/useOpenLink";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon, type IconName } from "@/components/ui/Icon";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { useToast } from "@/components/ui/useToast";
import {
  EXAMPLE_ACCEPT,
  EXAMPLE_MAX_BYTES,
  EXAMPLE_TEXT as TEXT,
  EXAMPLES_MAX,
} from "@/constants/documents";
import { LABELS } from "@/constants/messages";
import { useFocusAfterChange } from "@/hooks/useFocusAfterChange";
import {
  addDocumentExample,
  ExampleRefusedError,
  fetchDocumentExampleLink,
  InvalidFieldsError,
  removeDocumentExample,
  replaceDocumentExample,
  setDocumentInstruction,
  type ConfiguredDocumentType,
  type DocumentExample,
} from "@/lib/api";
import { formatFileSize } from "@/lib/catalogue";

type DocumentExamplesDialogProps = {
  type: ConfiguredDocumentType;
  onClose: () => void;
  /** The type changed (an example added, replaced or removed, or the instruction saved). */
  onChanged: (type: ConfiguredDocumentType) => void;
};

/** What a chosen file is for: a new example, or in place of one already kept. */
type Choosing = { replacing: DocumentExample | null; file: File };

/**
 * A Document Type's instruction and example files in Configuration → Documents (ticket 11;
 * prototype `#consultancy-settings` with `sec=1`). Files are added, replaced and removed (to the
 * Bin) at once; Save keeps the instruction. Focus stays with the file used (design system rule 8).
 */
export function DocumentExamplesDialog({ type, onClose, onChanged }: DocumentExamplesDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);
  const focusAfterChange = useFocusAfterChange();
  const [instruction, setInstruction] = useState(type.instruction);
  const [instructionErrors, setInstructionErrors] = useState<string[] | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<DocumentExample | null>(null);
  const files = useExampleFiles(type, onChanged);
  const link = useOpenLink(TEXT.linkFailed);

  async function choose({ replacing, file }: Choosing): Promise<void> {
    const problem = problemWith(file);
    setFailure(problem);
    if (problem !== null) return;
    try {
      await (replacing === null ? addNew(file) : putInPlace(replacing, file));
    } catch (error) {
      setFailure(uploadFailure(error));
    }
  }

  async function addNew(file: File): Promise<void> {
    const added = await files.add(file);
    showToast(TEXT.added(added.fileName));
    // Add an example file is gone once the type is full: the new file's Open takes focus.
    if (files.examples.length + 1 >= EXAMPLES_MAX) {
      focusAfterChange(() => openAt(listRef.current, EXAMPLES_MAX - 1));
    }
  }

  async function putInPlace(old: DocumentExample, file: File): Promise<void> {
    const place = files.examples.indexOf(old);
    await files.replace(old, file);
    showToast(TEXT.replaced(old.fileName));
    focusAfterChange(() => openAt(listRef.current, place));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setInstructionErrors(undefined);
    setFailure(null);
    try {
      const saved = await setDocumentInstruction(type.id, oneLine(instruction));
      onChanged(saved);
      showToast(TEXT.saved(type.name));
      onClose();
    } catch (error) {
      setSaving(false);
      if (error instanceof InvalidFieldsError) setInstructionErrors(error.fieldErrors.instruction);
      else setFailure(TEXT.saveFailed);
    }
  }

  return (
    <>
      <SaveDialog
        title={TEXT.editTitle(type.name)}
        formId={formId}
        saveLabel={LABELS.save}
        isSaving={isSaving}
        failure={failure ?? link.failure}
        onClose={onClose}
        isWide
        keysHint="save"
      >
        <form
          id={formId}
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <p className="text-ink-2">{TEXT.editIntro}</p>
          <TextAreaField
            label={TEXT.instruction}
            name="instruction"
            rows={3}
            value={instruction}
            onChange={setInstruction}
            placeholder={TEXT.instructionPlaceholder}
            hint={TEXT.instructionCount(oneLine(instruction).length)}
            errors={instructionErrors}
          />
        </form>
        <div ref={listRef}>
          <ExampleFiles
            typeName={type.name}
            examples={files.examples}
            onOpen={(example) => {
              void link.open(() => fetchDocumentExampleLink(example.id, "open"));
            }}
            onChoose={(choosing) => {
              void choose(choosing);
            }}
            onRemove={setRemoving}
          />
        </div>
      </SaveDialog>
      {removing !== null && (
        <ConfirmDialog
          title={TEXT.removeTitle(removing.fileName)}
          actionLabel={TEXT.remove}
          failureOf={() => TEXT.changeFailed}
          onConfirm={async () => {
            const place = files.examples.indexOf(removing);
            await files.remove(removing);
            setRemoving(null);
            showToast(TEXT.removed(removing.fileName));
            focusAfterChange(() => openAt(listRef.current, place));
          }}
          onClose={() => {
            setRemoving(null);
          }}
        >
          {TEXT.removeBody}
        </ConfirmDialog>
      )}
    </>
  );
}

/** The type's example files, kept here and told to the page after each change. */
function useExampleFiles(
  type: ConfiguredDocumentType,
  onChanged: (type: ConfiguredDocumentType) => void,
) {
  const [examples, setExamples] = useState<readonly DocumentExample[]>(type.examples);
  const [count, setCount] = useState(type.exampleCount);

  function keep(next: readonly DocumentExample[], nextCount: number): void {
    setExamples(next);
    setCount(nextCount);
    onChanged({ ...type, examples: [...next], exampleCount: nextCount });
  }

  return {
    examples,
    add: async (file: File): Promise<DocumentExample> => {
      const added = await addDocumentExample(type.id, file);
      keep([...examples, added], count + 1);
      return added;
    },
    replace: async (old: DocumentExample, file: File): Promise<void> => {
      const added = await replaceDocumentExample(old.id, file);
      keep(
        examples.map((one) => (one.id === old.id ? added : one)),
        count + 1,
      );
    },
    remove: async (old: DocumentExample): Promise<void> => {
      await removeDocumentExample(old.id);
      keep(
        examples.filter((one) => one.id !== old.id),
        count,
      );
    },
  };
}

type ExampleFilesProps = {
  typeName: string;
  examples: readonly DocumentExample[];
  onOpen: (example: DocumentExample) => void;
  onChoose: (choosing: Choosing) => void;
  onRemove: (example: DocumentExample) => void;
};

/** "Example files (2 of 3)": each with Open, Replace and Remove, then Add an example file. */
function ExampleFiles({ typeName, examples, onOpen, onChoose, onRemove }: ExampleFilesProps) {
  return (
    <fieldset className="mt-5 grid min-w-0 gap-3">
      <legend className="text-body text-ink mb-2 font-semibold">
        {TEXT.filesLegend}{" "}
        <span className="text-ink-2 font-normal">{TEXT.filesCount(examples.length)}</span>
      </legend>
      {examples.length === 0 ? (
        <p className="text-small text-ink-2">{TEXT.noFiles}</p>
      ) : (
        <ul aria-label={TEXT.filesLegend} className="divide-rule grid divide-y">
          {examples.map((example) => (
            <ExampleRow
              key={example.id}
              example={example}
              onOpen={onOpen}
              onChoose={onChoose}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
      {examples.length < EXAMPLES_MAX ? (
        <FilePicker
          icon="upload"
          text={TEXT.addFile}
          label={TEXT.addFileFor(typeName)}
          onFile={(file) => {
            onChoose({ replacing: null, file });
          }}
        />
      ) : (
        <p className="text-small text-ink-2">{TEXT.full}</p>
      )}
    </fieldset>
  );
}

type ExampleRowProps = Omit<ExampleFilesProps, "typeName" | "examples"> & {
  example: DocumentExample;
};

function ExampleRow({ example, onOpen, onChoose, onRemove }: ExampleRowProps) {
  const name = example.fileName;
  return (
    <li data-example-row className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <span className="inline-flex min-w-0 flex-1 items-center gap-2">
        <Icon name="file" size="sm" />
        <span className="break-all">{name}</span>
        <span className="text-small text-ink-2 tabular-nums">{formatFileSize(example.size)}</span>
      </span>
      <span className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onOpen(example);
          }}
        >
          <span aria-hidden="true">{TEXT.open}</span>
          <span className="sr-only">{TEXT.openFile(name)}</span>
        </Button>
        <FilePicker
          text={TEXT.replace}
          label={TEXT.replaceFile(name)}
          onFile={(file) => {
            onChoose({ replacing: example, file });
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onRemove(example);
          }}
        >
          <span aria-hidden="true">{TEXT.remove}</span>
          <span className="sr-only">{TEXT.removeFile(name)}</span>
        </Button>
      </span>
    </li>
  );
}

type FilePickerProps = {
  text: string;
  /** What the file picker is called for screen readers. */
  label: string;
  icon?: IconName;
  onFile: (file: File) => void;
};

/** A button-looking label around a file picker for a PDF, JPEG or PNG. */
function FilePicker({ text, label, icon, onFile }: FilePickerProps) {
  return (
    <label
      className={clsx(
        buttonClasses("secondary", "sm"),
        "has-focus-visible:outline-accent w-fit has-focus-visible:outline-3 has-focus-visible:outline-offset-2",
      )}
    >
      {icon !== undefined && <Icon name={icon} size="sm" />}
      <span aria-hidden="true">{text}</span>
      <input
        type="file"
        accept={EXAMPLE_ACCEPT}
        aria-label={label}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.item(0);
          // The same file can be chosen again after a refusal.
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

/** What to say about a chosen file before sending it, or null when it can be sent. */
function problemWith(file: File): string | null {
  const isAllowed = /\.(pdf|jpe?g|png)$/i.test(file.name);
  if (!isAllowed) return TEXT.wrongKind;
  return file.size > EXAMPLE_MAX_BYTES ? TEXT.tooBig(formatFileSize(file.size)) : null;
}

/** Why an upload failed: the server's words about the file, its one-sentence reason, or ours. */
function uploadFailure(error: unknown): string {
  if (error instanceof InvalidFieldsError) {
    return error.fieldErrors.file?.join(" ") ?? TEXT.uploadFailed;
  }
  if (error instanceof ExampleRefusedError) return error.message;
  return TEXT.uploadFailed;
}

/** The instruction is one line: line breaks typed in the box become spaces. */
function oneLine(text: string): string {
  return text.replace(/\s*[\r\n]+\s*/g, " ").trim();
}

/** After a change: the Open button now at `place`, else the one before, else Add a file. */
function openAt(list: HTMLElement | null, place: number): HTMLElement | null {
  if (list === null) return null;
  const opens = [...list.querySelectorAll<HTMLElement>("[data-example-row] button")];
  return opens[place] ?? opens[place - 1] ?? list.querySelector<HTMLElement>("input");
}
