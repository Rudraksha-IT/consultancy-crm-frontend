"use client";

import { useEffect, useState } from "react";

import { readField } from "@/components/features/students/profile/formData";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { FEE_TYPE_TEXT as TEXT } from "@/constants/feeTypes";
import { fetchFeeTypes, InvalidFieldsError, type FeeType, type FeeTypeRef } from "@/lib/api";

/** The office's Fee Types for a form: null while loading, "failed" when they couldn't be read. */
export type FeeTypeChoices = FeeType[] | "failed" | null;

/** Read the office's Fee Types once, for picking one on a Fee or Payment. */
export function useFeeTypeChoices(): FeeTypeChoices {
  const [choices, setChoices] = useState<FeeTypeChoices>(null);
  useEffect(() => {
    let isCancelled = false;
    fetchFeeTypes().then(
      (types) => {
        if (!isCancelled) setChoices(types);
      },
      () => {
        if (!isCancelled) setChoices("failed");
      },
    );
    return () => {
      isCancelled = true;
    };
  }, []);
  return choices;
}

/** What the record is for now, when changing one: its Fee Type and note. */
export type FeeTypeStart = { feeType: FeeTypeRef; note: string };

type FeeTypeFieldsProps = {
  choices: FeeTypeChoices;
  initial?: FeeTypeStart | undefined;
  fieldErrors: Partial<Record<string, string[]>>;
};

/**
 * Pick a Fee Type and add a short note (issue 06). Hidden Fee Types aren't offered, except the
 * one the record already has. The note is needed for Other, and optional otherwise.
 */
export function FeeTypeFields({ choices, initial, fieldErrors }: FeeTypeFieldsProps) {
  const start = startOf(initial);
  const [chosen, setChosen] = useState(start.chosen);
  return (
    <>
      <SelectField
        label={TEXT.feeType}
        name="feeTypeId"
        options={feeTypeOptions(choices, start.kept)}
        value={chosen}
        onChange={setChosen}
        errors={fieldErrors.feeTypeId ?? loadErrorsOf(choices)}
      />
      <NoteField
        isNeeded={isOtherId(choices, idOf(chosen))}
        start={start.note}
        errors={fieldErrors.note}
      />
    </>
  );
}

type NoteFieldProps = { isNeeded: boolean; start: string; errors: string[] | undefined };

/** The short note: needed (and said so) for Other, optional otherwise. */
function NoteField({ isNeeded, start, errors }: NoteFieldProps) {
  return (
    <TextField
      label={TEXT.note}
      name="note"
      autoComplete="off"
      placeholder={TEXT.notePlaceholder}
      isOptional={!isNeeded}
      hint={isNeeded ? TEXT.noteNeeded : undefined}
      defaultValue={start}
      errors={errors}
    />
  );
}

/** What the fields start with: the record's Fee Type and note, or nothing chosen. */
function startOf(initial: FeeTypeStart | undefined) {
  if (initial === undefined) return { kept: undefined, chosen: "", note: "" };
  return { kept: initial.feeType, chosen: String(initial.feeType.id), note: initial.note };
}

function loadErrorsOf(choices: FeeTypeChoices): string[] | undefined {
  return choices === "failed" ? [TEXT.typesFailed] : undefined;
}

/**
 * "Choose a Fee Type", then every Fee Type not hidden, in order. The record's own Fee Type stays
 * offered even when hidden (or missing from the list), so changing other fields keeps it.
 */
function feeTypeOptions(choices: FeeTypeChoices, kept: FeeTypeRef | undefined) {
  const types = Array.isArray(choices) ? choices : [];
  const offered: FeeTypeRef[] = types.filter((type) => !type.hidden || type.id === kept?.id);
  if (kept !== undefined && !offered.some((type) => type.id === kept.id)) offered.push(kept);
  return [
    { value: "", label: TEXT.choose },
    ...offered.map((type) => ({ value: String(type.id), label: type.name })),
  ];
}

/** A chosen id, or null for none (or anything that isn't a whole number). */
function idOf(value: string): number | null {
  return /^[0-9]+$/.test(value) ? Number(value) : null;
}

function isOtherId(choices: FeeTypeChoices, id: number | null): boolean {
  return Array.isArray(choices) && choices.some((type) => type.isOther && type.id === id);
}

/**
 * The Fee Type and note typed into `FeeTypeFields`. Adds refusals to `errors` (no Fee Type
 * chosen; Other without a note) so nothing is sent while one is there.
 */
export function readFeeTypeChoice(
  form: FormData,
  choices: FeeTypeChoices,
  errors: Partial<Record<"feeTypeId" | "note", string[]>>,
): { feeTypeId: number | null; note: string } {
  const feeTypeId = idOf(readField(form, "feeTypeId"));
  const note = readField(form, "note").trim();
  if (feeTypeId === null) errors.feeTypeId = [TEXT.chooseRefused];
  else if (note === "" && isOtherId(choices, feeTypeId)) errors.note = [TEXT.noteRefused];
  return { feeTypeId, note };
}

/** Throw the refusals gathered while reading a form, if any. */
export function throwIfRefused(errors: Partial<Record<string, string[]>>): void {
  if (Object.keys(errors).length > 0) throw new InvalidFieldsError(errors);
}
