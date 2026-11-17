"use client";

import { useState } from "react";

import type { Batch } from "@/lib/api";

import { BatchFormDialog } from "./BatchFormDialog";
import { ClassDialog } from "./ClassDialog";
import { EnrollDialog } from "./EnrollDialog";

type OpenDialog = { kind: "new" } | { kind: "peek"; batch: Batch } | { kind: "enroll" } | null;

export type ClassDialogsState = {
  open: OpenDialog;
  openNew: () => void;
  openEnroll: () => void;
  openPeek: (batch: Batch) => void;
  close: () => void;
};

/** Which class dialog is open: New class, Who's in it, or Enroll a Student. */
export function useClassDialogs(): ClassDialogsState {
  const [open, setOpen] = useState<OpenDialog>(null);
  return {
    open,
    openNew: () => {
      setOpen({ kind: "new" });
    },
    openEnroll: () => {
      setOpen({ kind: "enroll" });
    },
    openPeek: (batch) => {
      setOpen({ kind: "peek", batch });
    },
    close: () => {
      setOpen(null);
    },
  };
}

type ClassDialogsProps = {
  dialogs: ClassDialogsState;
  /** The classes a Student can be enrolled in; finished ones are left out. */
  classes: readonly Batch[];
  /** A class or who is in it changed, so lists should load again. */
  onChanged: () => void;
};

/** The open class dialog, if any. Editing a class is on its own page. */
export function ClassDialogs({ dialogs, classes, onChanged }: ClassDialogsProps) {
  const { open, close } = dialogs;
  if (open === null) return null;
  const saved = () => {
    close();
    onChanged();
  };
  switch (open.kind) {
    case "new":
      return <BatchFormDialog onClose={close} onSaved={saved} />;
    case "enroll":
      return <EnrollDialog classes={classes} onClose={close} onEnrolled={saved} />;
    case "peek":
      return <ClassDialog batch={open.batch} onClose={close} onChanged={onChanged} />;
  }
}
