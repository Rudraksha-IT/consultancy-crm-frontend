"use client";

import type { RecordId } from "@/lib/recordId";
import clsx from "clsx";
import { useId, useRef, useState, type SubmitEvent } from "react";

import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { Banner } from "@/components/ui/Banner";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { CATALOGUE_TEXT as TEXT } from "@/constants/catalogue";
import { useFocusAfterChange } from "@/hooks/useFocusAfterChange";
import {
  binCourseFile,
  CatalogueRefusedError,
  fetchCourseFileLink,
  InvalidFieldsError,
  renameCourseFile,
  uploadCourseFile,
  type Course,
  type CourseFile,
  type CourseFileField,
} from "@/lib/api";
import { courseFileProblem, formatFileSize, nameFromFile } from "@/lib/catalogue";

import { catalogueFailure } from "./catalogueFailure";
import { useOpenLink } from "./useOpenLink";

type CourseFilesCellProps = {
  course: Course;
  /** The Course and its University are in use: files can be added. */
  isLive: boolean;
  /** Something changed: load the Catalogue again (in place, keeping the page where it is). */
  onChanged: () => void;
};

/** What the name dialog is for: a newly chosen PDF, or renaming one already kept. */
type Naming = { kind: "new"; file: File } | { kind: "rename"; courseFile: CourseFile } | null;

/**
 * A Course's PDF brochures in Configuration → Universities (ticket 10): each opens through a short
 * link and has Rename and Delete (to the Bin); "Upload PDF" while the Course is in use. After a
 * delete, focus goes to the next file, or to Upload PDF (design system rule 8).
 */
export function CourseFilesCell({ course, isLive, onChanged }: CourseFilesCellProps) {
  const { showToast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);
  const focusAfterChange = useFocusAfterChange();
  const { files, setFiles } = useShownFiles(course.files);
  const [problem, setProblem] = useState<string | null>(null);
  const [naming, setNaming] = useState<Naming>(null);
  const [binning, setBinning] = useState<CourseFile | null>(null);
  const link = useOpenLink(TEXT.linkFailed);

  function choose(file: File): void {
    const found = problemWith(file);
    setProblem(found);
    if (found === null) setNaming({ kind: "new", file });
  }

  return (
    <div ref={listRef} className="grid min-w-0 justify-items-start gap-2">
      <FileList
        courseName={course.name}
        files={files}
        onOpen={(file) => {
          void link.open(() => fetchCourseFileLink(file.id, "open"));
        }}
        onRename={(file) => {
          setNaming({ kind: "rename", courseFile: file });
        }}
        onDelete={setBinning}
      />
      <UploadArea
        courseName={course.name}
        isLive={isLive}
        failure={problem ?? link.failure}
        onChoose={choose}
      />
      {naming !== null && (
        <NameDialog
          naming={naming}
          courseId={course.id}
          onClose={() => {
            setNaming(null);
          }}
          onSaved={(saved) => {
            setNaming(null);
            setFiles((current) => withSaved(current, saved));
            showToast(naming.kind === "new" ? TEXT.uploaded(saved.name) : TEXT.renamed);
            onChanged();
          }}
        />
      )}
      {binning !== null && (
        <ConfirmDialog
          title={TEXT.binFileTitle(binning.name)}
          actionLabel={TEXT.binFileAction}
          failureOf={catalogueFailure}
          onConfirm={async () => {
            await binCourseFile(binning.id);
            const place = files.findIndex((one) => one.id === binning.id);
            setFiles((current) => current.filter((one) => one.id !== binning.id));
            setBinning(null);
            showToast(TEXT.fileInBin(binning.name));
            focusAfterChange(() => nextFocus(listRef.current, place));
            onChanged();
          }}
          onClose={() => {
            setBinning(null);
          }}
        >
          {TEXT.binFileBody}
        </ConfirmDialog>
      )}
    </div>
  );
}

/** The files shown, starting again from each newer Catalogue answer. */
function useShownFiles(given: readonly CourseFile[]): {
  files: readonly CourseFile[];
  setFiles: (change: (current: readonly CourseFile[]) => readonly CourseFile[]) => void;
} {
  const [files, setFiles] = useState(given);
  const [shown, setShown] = useState(given);
  // A newer Catalogue answer replaces what is shown (React: adjusting state while rendering).
  if (given !== shown) {
    setShown(given);
    setFiles(given);
  }
  return { files, setFiles };
}

/** The list with a file saved: a new one added at the end, a renamed one in its place. */
function withSaved(files: readonly CourseFile[], saved: CourseFile): readonly CourseFile[] {
  const isKept = files.some((one) => one.id === saved.id);
  return isKept ? files.map((one) => (one.id === saved.id ? saved : one)) : [...files, saved];
}

/** What to say about a chosen file before sending it, or null when it can be named and sent. */
function problemWith(file: File): string | null {
  const found = courseFileProblem(file);
  if (found === null) return null;
  return found === "notPdf" ? TEXT.notPdf : TEXT.fileTooBig(formatFileSize(file.size));
}

/** After a delete: the file now in its place, else the one before, else Upload PDF. */
function nextFocus(cell: HTMLElement | null, place: number): HTMLElement | null {
  if (cell === null) return null;
  const opens = [...cell.querySelectorAll<HTMLElement>("[data-file-open]")];
  return opens[place] ?? opens[place - 1] ?? cell.querySelector<HTMLElement>("input");
}

type FileListProps = {
  courseName: string;
  files: readonly CourseFile[];
  onOpen: (file: CourseFile) => void;
  onRename: (file: CourseFile) => void;
  onDelete: (file: CourseFile) => void;
};

function FileList({ courseName, files, onOpen, onRename, onDelete }: FileListProps) {
  if (files.length === 0) return <span className="text-ink-2">{TEXT.noCourseFiles}</span>;
  return (
    <ul aria-label={`${TEXT.courseFiles}: ${courseName}`} className="grid w-full gap-1">
      {files.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          onOpen={() => {
            onOpen(file);
          }}
          onRename={() => {
            onRename(file);
          }}
          onDelete={() => {
            onDelete(file);
          }}
        />
      ))}
    </ul>
  );
}

type UploadAreaProps = {
  courseName: string;
  /** Files can be added: the Course and its University are in use. */
  isLive: boolean;
  /** Why the last chosen file, or opening a file, didn't work. */
  failure: string | null;
  onChoose: (file: File) => void;
};

function UploadArea({ courseName, isLive, failure, onChoose }: UploadAreaProps) {
  return (
    <>
      {isLive && <UploadButton courseName={courseName} onChoose={onChoose} />}
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
    </>
  );
}

type FileRowProps = {
  file: CourseFile;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
};

/** One PDF: its name (which opens it), its size, Rename and Delete. */
function FileRow({ file, onOpen, onRename, onDelete }: FileRowProps) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-2">
      <button
        type="button"
        data-file-open
        title={file.fileName}
        aria-label={TEXT.openFile(file.name)}
        onClick={onOpen}
        className="min-h-control text-accent inline-flex min-w-0 cursor-pointer items-center gap-1.5 text-left underline-offset-4 hover:underline"
      >
        <Icon name="file" size="sm" />
        <span className="break-words">{file.name}</span>
      </button>
      <span className="text-small text-ink-2 tabular-nums">{formatFileSize(file.size)}</span>
      <span className="ml-auto inline-flex">
        <IconButton icon="edit" label={TEXT.renameFile(file.name)} onClick={onRename} />
        <IconButton icon="trash" label={TEXT.deleteFile(file.name)} onClick={onDelete} />
      </span>
    </li>
  );
}

/** "Upload PDF": a button-looking label around the file picker (PDFs only). */
function UploadButton({
  courseName,
  onChoose,
}: {
  courseName: string;
  onChoose: (file: File) => void;
}) {
  return (
    <label
      className={clsx(
        buttonClasses("secondary", "sm"),
        "has-focus-visible:outline-accent has-focus-visible:outline-3 has-focus-visible:outline-offset-2",
      )}
    >
      <Icon name="upload" size="sm" />
      <span aria-hidden="true">{TEXT.uploadPdf}</span>
      <input
        type="file"
        accept="application/pdf,.pdf"
        aria-label={TEXT.uploadPdfFor(courseName)}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.item(0);
          // The same file can be chosen again after a refusal.
          event.target.value = "";
          if (file) onChoose(file);
        }}
      />
    </label>
  );
}

type NameDialogProps = {
  naming: Exclude<Naming, null>;
  courseId: RecordId;
  onClose: () => void;
  onSaved: (file: CourseFile) => void;
};

/** Name a new PDF before it uploads, or rename one already kept. */
function NameDialog({ naming, courseId, onClose, onSaved }: NameDialogProps) {
  const formId = useId();
  const words = dialogWords(naming);
  const [name, setName] = useState(words.startName);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      setErrors({ name: [TEXT.nameNeeded] });
      return;
    }
    setSaving(true);
    setErrors({});
    setFailure(null);
    try {
      onSaved(await saveNamed(naming, courseId, trimmed));
    } catch (error) {
      const refusal = refusalOf(error, naming.kind === "new");
      setSaving(false);
      setErrors(refusal.errors);
      setFailure(refusal.failure);
    }
  }

  return (
    <SaveDialog
      title={words.title}
      formId={formId}
      saveLabel={words.saveLabel}
      saveIcon={words.saveIcon}
      isSaving={isSaving}
      failure={shownFailure(failure, errors)}
      onClose={onClose}
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <TextField
          label={TEXT.fileNameLabel}
          name="name"
          autoComplete="off"
          value={name}
          onChange={setName}
          hint={words.hint}
          errors={errors.name}
        />
      </form>
    </SaveDialog>
  );
}

type FieldErrors = Partial<Record<CourseFileField, string[]>>;

/** The dialog's words for a new PDF or a rename, and the name it starts from. */
function dialogWords(naming: Exclude<Naming, null>): {
  title: string;
  saveLabel: string;
  saveIcon: IconName;
  hint: string;
  startName: string;
} {
  if (naming.kind === "new") {
    const { file } = naming;
    return {
      title: TEXT.nameFileTitle,
      saveLabel: TEXT.upload,
      saveIcon: "upload",
      hint: TEXT.newFileHint(file.name, formatFileSize(file.size)),
      startName: nameFromFile(file.name),
    };
  }
  return {
    title: TEXT.renameFileTitle,
    saveLabel: TEXT.save,
    saveIcon: "check",
    hint: TEXT.renameHint(naming.courseFile.fileName),
    startName: naming.courseFile.name,
  };
}

function saveNamed(
  naming: Exclude<Naming, null>,
  courseId: RecordId,
  name: string,
): Promise<CourseFile> {
  return naming.kind === "new"
    ? uploadCourseFile(courseId, naming.file, name)
    : renameCourseFile(naming.courseFile.id, name);
}

/** What a failed save says: under the name, or in the dialog's banner. */
function refusalOf(
  error: unknown,
  isNew: boolean,
): { errors: FieldErrors; failure: string | null } {
  if (error instanceof InvalidFieldsError) return { errors: error.fieldErrors, failure: null };
  if (error instanceof CatalogueRefusedError) return { errors: {}, failure: error.message };
  return { errors: {}, failure: failureOf(error, isNew) };
}

/** The banner: a failure, else the server's words about the file itself. */
function shownFailure(failure: string | null, errors: FieldErrors): string | null {
  return failure ?? errors.file?.join(" ") ?? null;
}

function failureOf(error: unknown, isNew: boolean): string {
  const said = catalogueFailure(error);
  return isNew && said === TEXT.changeFailed ? TEXT.uploadFailed : said;
}
