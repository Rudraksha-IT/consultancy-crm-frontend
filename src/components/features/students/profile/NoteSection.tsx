"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { NoteCard } from "@/components/ui/NoteCard";
import { SubmitKeysHint, SubmitKeysScope } from "@/components/ui/SubmitKeys";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import { InvalidFieldsError, saveNote, type StudentProfile } from "@/lib/api";

import { saveFailure } from "./saveErrors";

const NOTE_ROWS = 5;

type NoteSectionProps = {
  profile: StudentProfile;
  onSaved: (profile: StudentProfile) => void;
};

/** The Student's one Note, at the top. Those who can change the Student edit it in place. */
export function NoteSection({ profile, onSaved }: NoteSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const editButton = profile.canChange && !isEditing && (
    <Button
      variant="ghost"
      icon="edit"
      onClick={() => {
        setIsEditing(true);
      }}
    >
      {editLabel(profile.note)}
    </Button>
  );

  return (
    <NoteCard title={LABELS.note} action={editButton}>
      {isEditing ? (
        <NoteForm
          profile={profile}
          onCancel={() => {
            setIsEditing(false);
          }}
          onSaved={(saved) => {
            setIsEditing(false);
            onSaved(saved);
          }}
        />
      ) : (
        <NoteText note={profile.note} />
      )}
    </NoteCard>
  );
}

function NoteText({ note }: { note: string }) {
  return (
    <p className="text-card-title max-w-prose font-normal whitespace-pre-wrap">
      {note === "" ? <span className="text-ink-2">{MESSAGES.nothingWrittenYet}</span> : note}
    </p>
  );
}

type NoteFormProps = {
  profile: StudentProfile;
  onCancel: () => void;
  onSaved: (profile: StudentProfile) => void;
};

function NoteForm({ profile, onCancel, onSaved }: NoteFormProps) {
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    formRef.current?.querySelector("textarea")?.focus();
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get("note");
    setIsSaving(true);
    setErrors(undefined);
    setFailure(null);
    try {
      const saved = await saveNote(profile.id, typeof note === "string" ? note : "");
      showToast(MESSAGES.noteSaved);
      onSaved(saved);
    } catch (error) {
      if (error instanceof InvalidFieldsError) setErrors(error.fieldErrors.note);
      else setFailure(saveFailure(error));
      setIsSaving(false);
    }
  }

  // Enter makes a new line, Ctrl + Enter saves and Escape cancels (design system, Keyboard).
  return (
    <SubmitKeysScope>
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="grid gap-4"
      >
        <TextAreaField
          label={LABELS.note}
          isLabelHidden
          isOptional
          name="note"
          rows={NOTE_ROWS}
          defaultValue={profile.note}
          errors={errors}
          onEscape={onCancel}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" isLoading={isSaving} loadingLabel={LABELS.saving}>
            {LABELS.saveNote}
          </Button>
          <Button onClick={onCancel}>{LABELS.cancel}</Button>
          <SubmitKeysHint action="save" canEscape />
          <span className="text-small text-ink-2">{MESSAGES.oldNoteKept}</span>
        </div>
        {failure !== null && <Banner tone="problem">{failure}</Banner>}
      </form>
    </SubmitKeysScope>
  );
}

function editLabel(note: string): string {
  return note === "" ? LABELS.addNote : LABELS.edit;
}
