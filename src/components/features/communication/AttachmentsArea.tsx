"use client";

import { useRef, useState, type RefObject } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import { MESSAGES } from "@/constants/messages";
import type { Attachable, AttachableFiles } from "@/lib/api";
import { formatFileSize } from "@/lib/catalogue";

import type { Attached, Attachments } from "./useAttachments";

type AttachmentsAreaProps = {
  attachments: Attachments;
  /** An email to many Students: only Course Files and Document Examples. */
  isBulk: boolean;
  /** Why the server refused the files, if it did. */
  errors: string[] | undefined;
};

/**
 * The files going with the email (ticket 12; prototype: the composer's attachments): each as a
 * chip with its size and Remove, "Attach files" with the running total of 10 MB, a warning naming
 * the biggest file when they add up to more, and the picker of files already in the app.
 */
export function AttachmentsArea({ attachments, isBulk, errors }: AttachmentsAreaProps) {
  const attachButton = useRef<HTMLButtonElement>(null);
  return (
    <section aria-label={TEXT.attachedFiles} className="grid gap-3">
      <FileChips attachments={attachments} attachButton={attachButton} />
      <AttachBar attachments={attachments} attachButton={attachButton} />
      <SizeProblems attachments={attachments} errors={errors} />
      {attachments.isPicking && (
        <Picker
          attachments={attachments}
          isBulk={isBulk}
          onDone={() => {
            attachments.setPicking(false);
            attachButton.current?.focus();
          }}
        />
      )}
    </section>
  );
}

type WithButton = {
  attachments: Attachments;
  attachButton: RefObject<HTMLButtonElement | null>;
};

/** Each file attached, with its size and Remove; focus moves on when one goes (rule 8). */
function FileChips({ attachments, attachButton }: WithButton) {
  const chips = useRef<HTMLUListElement>(null);
  if (attachments.files.length === 0) return null;

  function removeAt(index: number, file: Attached): void {
    attachments.remove(file);
    // The chip goes: focus the next file's Remove, else the one before, else Attach files.
    const buttons = Array.from(chips.current?.querySelectorAll("button") ?? []);
    nearest(buttons, index, attachButton.current)?.focus();
  }

  return (
    <ul ref={chips} aria-label={TEXT.attachedFiles} className="flex flex-wrap gap-2">
      {attachments.files.map((file, index) => (
        <li
          key={`${file.kind}-${file.id}`}
          title={`${file.group} · ${formatFileSize(file.size)}`}
          className="rounded-chip bg-fill text-secondary flex max-w-full min-w-0 items-center gap-2 pl-3"
        >
          <Icon name="file" size="sm" />
          <span className="text-ink min-w-0 truncate">{file.fileName}</span>
          <span className="text-ink-2 flex-none">{formatFileSize(file.size)}</span>
          <IconButton
            icon="x"
            label={TEXT.removeFile(file.fileName)}
            onClick={() => {
              removeAt(index, file);
            }}
          />
        </li>
      ))}
    </ul>
  );
}

/** The next button after `index`, else the one before, else `fallback`. */
function nearest(
  buttons: readonly HTMLButtonElement[],
  index: number,
  fallback: HTMLButtonElement | null,
): HTMLButtonElement | null {
  return buttons[index + 1] ?? buttons[index - 1] ?? fallback;
}

/** "Attach files", and the running total of the 10 MB one email can carry. */
function AttachBar({ attachments, attachButton }: WithButton) {
  const { files, total, isOver, isPicking } = attachments;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Button
        ref={attachButton}
        size="sm"
        variant="ghost"
        icon="clip"
        isExpanded={isPicking}
        onClick={() => {
          attachments.setPicking(!isPicking);
        }}
      >
        {TEXT.attachFiles}
      </Button>
      <span className={isOver ? "text-small text-bad font-semibold" : "text-small text-ink-2"}>
        {files.length === 0 ? TEXT.upToTen : TEXT.sizeOfTen(formatFileSize(total))}
      </span>
    </div>
  );
}

/** Over 10 MB, naming the biggest file; and why the server refused the files. */
function SizeProblems({ attachments, errors }: Omit<AttachmentsAreaProps, "isBulk">) {
  const { total, isOver, biggest } = attachments;
  return (
    <>
      {isOver && biggest !== null && (
        <Banner tone="problem">{TEXT.overTen(formatFileSize(total), biggest.fileName)}</Banner>
      )}
      {errors !== undefined && <Banner tone="problem">{errors.join(" ")}</Banner>}
    </>
  );
}

type Source = "courseFiles" | "documentExamples" | "documents";

const SOURCES: readonly { value: Source; label: string }[] = [
  { value: "courseFiles", label: TEXT.courseFiles },
  { value: "documentExamples", label: TEXT.documentExamples },
  { value: "documents", label: TEXT.theirDocuments },
];

type PickerProps = { attachments: Attachments; isBulk: boolean; onDone: () => void };

/** Files already in the app, by where they come from; ticking one attaches it. */
function Picker({ attachments, isBulk, onDone }: PickerProps) {
  const [source, setSource] = useState<Source>("courseFiles");
  const sources = isBulk ? SOURCES.filter((each) => each.value !== "documents") : SOURCES;
  return (
    <div
      role="group"
      aria-label={TEXT.attachFrom}
      className="border-rule rounded-panel bg-paper grid gap-3 border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label={TEXT.whereFrom}
          options={sources}
          value={source}
          onChange={setSource}
        />
        <Button size="sm" onClick={onDone}>
          {TEXT.done}
        </Button>
      </div>
      <Choices attachments={attachments} source={source} />
      <p className="text-small text-ink-2">{isBulk ? TEXT.pickManyFrom : TEXT.pickOneFrom}</p>
    </div>
  );
}

function Choices({ attachments, source }: { attachments: Attachments; source: Source }) {
  const { choices } = attachments;
  if (choices.status !== "ready") {
    return <NotReady status={choices.status} onRetry={attachments.reload} />;
  }
  const files = filesOf(choices.files, source);
  if (files.length === 0) {
    return (
      <p className="text-secondary text-ink-2">
        {source === "documents" ? TEXT.noDocumentsYet : TEXT.nothingHere}
      </p>
    );
  }
  return (
    <ul className="grid gap-1">
      {files.map((file) => (
        <li key={`${file.kind}-${file.id}`}>
          <PickRow
            file={file}
            isChecked={attachments.isAttached(file)}
            onToggle={attachments.toggle}
          />
        </li>
      ))}
    </ul>
  );
}

type NotReadyProps = { status: "idle" | "loading" | "failed"; onRetry: () => void };

/** The files loading, or that they couldn't load, with Try again. */
function NotReady({ status, onRetry }: NotReadyProps) {
  if (status !== "failed") return <p className="text-secondary text-ink-2">{TEXT.filesLoading}</p>;
  return (
    <Banner tone="problem">
      {TEXT.filesFailed}{" "}
      <Button size="sm" variant="ghost" onClick={onRetry}>
        {MESSAGES.tryAgain}
      </Button>
    </Banner>
  );
}

function filesOf(files: AttachableFiles, source: Source): readonly Attachable[] {
  return files[source];
}

type PickRowProps = {
  file: Attachable;
  isChecked: boolean;
  onToggle: (file: Attachable) => void;
};

/** One file to tick: its name, then where it belongs and its size. The whole row toggles it. */
function PickRow({ file, isChecked, onToggle }: PickRowProps) {
  return (
    <label className="min-h-control rounded-control hover:bg-fill -mx-2 flex cursor-pointer items-center gap-3 px-2 py-1">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => {
          onToggle(file);
        }}
        className="accent-accent size-5 flex-none"
      />
      <span className="grid min-w-0">
        <span className="text-ink break-words">{file.name}</span>
        <span className="text-small text-ink-2 break-words">
          {TEXT.fileLine(file.group, formatFileSize(file.size))}
        </span>
      </span>
    </label>
  );
}
