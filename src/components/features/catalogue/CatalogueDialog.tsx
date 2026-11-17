"use client";

import { useToast } from "@/components/ui/useToast";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import type { Course, University } from "@/lib/api";

import { CourseDialog } from "./CourseDialog";
import { IntakesDialog } from "./IntakesDialog";
import { UniversityDialog } from "./UniversityDialog";

export type OpenDialog =
  | { kind: "university" }
  | { kind: "course"; university: University }
  | { kind: "intakes"; course: Course }
  | null;

type CatalogueDialogProps = {
  dialog: OpenDialog;
  onClose: () => void;
  /** After a save: the dialog closes and the list loads again. */
  onSaved: () => void;
};

/** The open Catalogue dialog, if any; a save is confirmed with a toast. */
export function CatalogueDialog({ dialog, onClose, onSaved }: CatalogueDialogProps) {
  const { showToast } = useToast();
  if (dialog === null) return null;
  if (dialog.kind === "university") {
    return (
      <UniversityDialog
        onClose={onClose}
        onSaved={() => {
          showToast(CATALOGUE_TEXT.universitySaved);
          onSaved();
        }}
      />
    );
  }
  if (dialog.kind === "intakes") {
    return (
      <IntakesDialog
        course={dialog.course}
        onClose={onClose}
        onSaved={(course) => {
          showToast(CATALOGUE_TEXT.intakesSaved(course.name));
          onSaved();
        }}
      />
    );
  }
  return (
    <CourseDialog
      universityId={dialog.university.id}
      onClose={onClose}
      onSaved={(course) => {
        showToast(CATALOGUE_TEXT.courseAdded(course.name));
        onSaved();
      }}
    />
  );
}
