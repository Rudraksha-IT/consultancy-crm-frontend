"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import { LABELS, MESSAGES } from "@/constants/messages";

import { Banner } from "./Banner";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { SegmentedChoice } from "./SegmentedChoice";
import { TextField } from "./TextField";

/** Asking why, in the same dialog: quick picks plus "Other" with a text box (design system). */
export type ConfirmReason = {
  /** The question, e.g. "Why should it be deleted?". */
  legend: string;
  /** The quick picks; the first is chosen to start. */
  picks: readonly string[];
  /** The last choice, which takes the words typed in the box. */
  otherChoice: string;
  otherLabel: string;
  otherPlaceholder: string;
  /** The most characters the words may have. */
  maxLength: number;
  /** Shown when Other is chosen with nothing typed. */
  neededMessage: string;
  /** Shown when more than `maxLength` characters are typed. */
  tooLongMessage: string;
};

type ConfirmDialogProps = {
  /** Names the thing, e.g. "Remove the Grade 12 Transcript?". */
  title: string;
  /** What will happen, in a sentence or two. */
  children: ReactNode;
  /** The red button names the action: "Remove", "Delete", "Cancel invite". Never "OK" or "Yes". */
  actionLabel: string;
  /** Ask why before doing it; the reason is passed to `onConfirm`. */
  reason?: ConfirmReason | undefined;
  /**
   * Does it (with the reason, "" when none is asked), and closes the dialog when done. A
   * rejection keeps the dialog open with a short message, so it can be tried again.
   */
  onConfirm: (reason: string) => Promise<void>;
  /** Cancel, Escape, the close button or a click outside: nothing happens. */
  onClose: () => void;
  /** The words for a failure; "We couldn't remove it. Please try again." by default. */
  failureOf?: (error: unknown) => string;
  /** The calm button, "Cancel" by default (e.g. "Keep editing" before leaving a page). */
  cancelLabel?: string;
};

/**
 * The one dialog that asks before anything is deleted or removed (design system, Confirm
 * dialog). Focus starts on Cancel; the action runs at most once at a time.
 */
export function ConfirmDialog({
  title,
  children,
  actionLabel,
  reason,
  onConfirm,
  onClose,
  failureOf = () => MESSAGES.removeFailed,
  cancelLabel = LABELS.cancel,
}: ConfirmDialogProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const why = useReasonChoice(reason);
  // State updates land after a render, so a second fast press is stopped here too.
  const isRunning = useRef(false);

  async function confirm(): Promise<void> {
    if (isRunning.current) return;
    const given = why.check();
    if (given === null) return;
    isRunning.current = true;
    setIsWorking(true);
    setFailure(null);
    try {
      await onConfirm(given);
    } catch (error) {
      setFailure(failureOf(error));
      setIsWorking(false);
    } finally {
      isRunning.current = false;
    }
  }

  return (
    <Dialog
      isOpen
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button hasFirstFocus onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            isLoading={isWorking}
            onClick={() => {
              void confirm();
            }}
          >
            {actionLabel}
          </Button>
        </>
      }
    >
      <div className="text-ink-2">{children}</div>
      {reason !== undefined && <ReasonFields reason={reason} choice={why} />}
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
    </Dialog>
  );
}

type ReasonChoice = {
  picked: string;
  typed: string;
  error: string | null;
  pick: (value: string) => void;
  type: (value: string) => void;
  /** The reason to send, or null (with the error shown) when it can't be sent. */
  check: () => string | null;
};

function useReasonChoice(reason: ConfirmReason | undefined): ReasonChoice {
  const [picked, setPicked] = useState(reason?.picks[0] ?? reason?.otherChoice ?? "");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  return {
    picked,
    typed,
    error,
    pick: setPicked,
    type: (value) => {
      setTyped(value);
      if (reason !== undefined) setPicked(reason.otherChoice);
    },
    check: () => {
      if (reason === undefined) return "";
      if (picked !== reason.otherChoice) return picked;
      const words = typed.trim();
      const problem = reasonProblem(words, reason);
      setError(problem);
      return problem === null ? words : null;
    },
  };
}

function reasonProblem(words: string, reason: ConfirmReason): string | null {
  if (words === "") return reason.neededMessage;
  return words.length > reason.maxLength ? reason.tooLongMessage : null;
}

/** The quick picks as one radio group, then the box for Other. */
function ReasonFields({ reason, choice }: { reason: ConfirmReason; choice: ReasonChoice }) {
  const name = useId();
  const options = [...reason.picks, reason.otherChoice].map((value) => ({ value, label: value }));
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <span className="text-small text-ink font-semibold">{reason.legend}</span>
        <SegmentedChoice
          label={reason.legend}
          name={name}
          options={options}
          value={choice.picked}
          onChange={choice.pick}
        />
      </div>
      <TextField
        label={reason.otherLabel}
        name="reason"
        placeholder={reason.otherPlaceholder}
        value={choice.typed}
        onChange={choice.type}
        errors={choice.error === null ? undefined : [choice.error]}
      />
    </div>
  );
}
