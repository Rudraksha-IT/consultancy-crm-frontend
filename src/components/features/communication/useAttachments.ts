"use client";

import { useEffect, useState } from "react";

import { EMAIL_MAX_BYTES } from "@/constants/communication";
import {
  fetchAttachable,
  type Attachable,
  type AttachableFiles,
  type ReadyMadeTarget,
} from "@/lib/api";

/** A file going with the email; `isSuggested` when the ready-made email put it there. */
export type Attached = Attachable & { isSuggested: boolean };

/** The files that can be attached, while they load, or that they couldn't load. */
export type AttachableChoices =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; files: AttachableFiles };

export type Attachments = {
  files: readonly Attached[];
  /** Every file's size added up, in bytes. */
  total: number;
  /** More than one email can carry (10 MB): it can't be sent. */
  isOver: boolean;
  /** The biggest file, named when it is over. */
  biggest: Attached | null;
  isAttached: (file: Attachable) => boolean;
  /** Tick or untick a file in the picker. */
  toggle: (file: Attachable) => void;
  remove: (file: Attachable) => void;
  /** The ready-made email's suggestions replace the last ones; files picked by hand stay. */
  suggest: (files: readonly Attachable[]) => void;
  isPicking: boolean;
  /** Open or close the picker; opening it the first time loads what can be attached. */
  setPicking: (isPicking: boolean) => void;
  choices: AttachableChoices;
  /** Load what can be attached again, after it failed. */
  reload: () => void;
};

const sameFile = (a: Attachable, b: Attachable) => a.kind === b.kind && a.id === b.id;

/**
 * The files going with an email (ticket 12): those it opens with (a Course's brochures, a Document
 * Type's examples), the ready-made email's suggestions, and any picked from the app. What can be
 * picked loads the first time the picker opens.
 */
export function useAttachments(
  target: ReadyMadeTarget,
  initial: readonly Attachable[] = [],
): Attachments {
  const [files, setFiles] = useState<Attached[]>(() =>
    initial.map((file) => ({ ...file, isSuggested: false })),
  );
  const [isPicking, setPickingNow] = useState(false);
  const { choices, load } = useChoices(target);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const isAttached = (file: Attachable) => files.some((each) => sameFile(each, file));

  function remove(file: Attachable): void {
    setFiles((now) => now.filter((each) => !sameFile(each, file)));
  }

  return {
    files,
    total,
    isOver: total > EMAIL_MAX_BYTES,
    biggest: files.reduce<Attached | null>(
      (big, file) => (big === null || file.size > big.size ? file : big),
      null,
    ),
    isAttached,
    toggle: (file) => {
      if (isAttached(file)) {
        remove(file);
        return;
      }
      setFiles((now) => [...now, { ...file, isSuggested: false }]);
    },
    remove,
    suggest: (suggested) => {
      setFiles((now) => {
        const kept = now.filter((file) => !file.isSuggested);
        const added = suggested
          .filter((file) => !kept.some((each) => sameFile(each, file)))
          .map((file) => ({ ...file, isSuggested: true }));
        return [...kept, ...added];
      });
    },
    isPicking,
    setPicking: (open) => {
      setPickingNow(open);
      if (open && choices.status === "idle") load();
    },
    choices,
    reload: load,
  };
}

/** What can be attached, loaded on each `load()`; a newer load wins. */
function useChoices(target: ReadyMadeTarget): { choices: AttachableChoices; load: () => void } {
  const [choices, setChoices] = useState<AttachableChoices>({ status: "idle" });
  const [turn, setTurn] = useState(0);
  const [fixed] = useState(target);
  useEffect(() => {
    if (turn === 0) return undefined;
    let isCancelled = false;
    fetchAttachable(fixed).then(
      (files) => {
        if (!isCancelled) setChoices({ status: "ready", files });
      },
      () => {
        if (!isCancelled) setChoices({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [fixed, turn]);
  return {
    choices,
    load: () => {
      setChoices({ status: "loading" });
      setTurn((last) => last + 1);
    },
  };
}
