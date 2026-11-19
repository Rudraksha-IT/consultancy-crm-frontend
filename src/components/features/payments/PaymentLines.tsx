"use client";

import { useEffect, useRef } from "react";

import {
  feeTypeOptions,
  idOf,
  isOtherId,
  loadErrorsOf,
  throwIfRefused,
  type FeeTypeChoices,
} from "@/components/features/feeTypes/FeeTypeFields";
import { Button } from "@/components/ui/Button";
import { LABEL_CLASSES } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { FEE_TYPE_TEXT } from "@/constants/feeTypes";
import { MAX_PAYMENT_LINES, PAYMENT_TEXT } from "@/constants/payments";
import type { NewPaymentLine } from "@/lib/api";
import { formatNpr } from "@/lib/money";

import { AMOUNT_MESSAGE, isWholeAmount } from "./PaymentFields";

/** One line as typed: the chosen Fee Type's id ("" for none), its note and amount, as text. */
export type LineDraft = { key: number; feeTypeId: string; note: string; amount: string };

type LineField = Exclude<keyof LineDraft, "key">;

/** A new, empty line. */
export function emptyLine(key = 0): LineDraft {
  return { key, feeTypeId: "", note: "", amount: "" };
}

type FieldErrors = Partial<Record<string, string[]>>;

type PaymentLinesProps = {
  lines: readonly LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  /** The office's Fee Types to pick from. */
  choices: FeeTypeChoices;
  /** Refusals: `lines` for the lines as a whole, `lines.<n>.<field>` for one line's field. */
  fieldErrors: FieldErrors;
};

/**
 * What one visit's money is for (spec 73): a Fee Type, note and amount per line, up to
 * `MAX_PAYMENT_LINES`, with the running total. Each line is saved as its own Payment, all on one
 * receipt. Adding a line moves focus to its Fee Type; removing one moves it to the line that
 * takes its place (or the one before), so nothing jumps (design system rule 8).
 */
export function PaymentLines({ lines, onChange, choices, fieldErrors }: PaymentLinesProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const focusKey = useRef<number | null>(null);

  useEffect(() => {
    const key = focusKey.current;
    if (key === null) return;
    focusKey.current = null;
    boxRef.current?.querySelector<HTMLElement>(`[data-line-key="${String(key)}"] select`)?.focus();
  }, [lines]);

  function add(): void {
    const key = Math.max(-1, ...lines.map((line) => line.key)) + 1;
    focusKey.current = key;
    onChange([...lines, emptyLine(key)]);
  }

  function remove(index: number): void {
    const rest = lines.filter((_, at) => at !== index);
    focusKey.current = (rest[index] ?? rest[index - 1])?.key ?? null;
    onChange(rest);
  }

  function change(index: number, field: LineField, value: string): void {
    onChange(lines.map((line, at) => (at === index ? { ...line, [field]: value } : line)));
  }

  return (
    <fieldset className="grid min-w-0 gap-4">
      <legend className="text-card-title float-left mb-1 w-full">{PAYMENT_TEXT.whatItsFor}</legend>
      <p className="text-small text-ink-2">{PAYMENT_TEXT.splitHelp}</p>
      <div ref={boxRef} className="grid gap-3">
        {lines.map((line, index) => (
          <LineFields
            key={line.key}
            line={line}
            place={index + 1}
            canRemove={lines.length > 1}
            choices={choices}
            errorsOf={(field) => fieldErrors[`lines.${String(index)}.${field}`]}
            onChange={(field, value) => {
              change(index, field, value);
            }}
            onRemove={() => {
              remove(index);
            }}
          />
        ))}
      </div>
      {fieldErrors.lines !== undefined && (
        <p className="text-small text-bad font-semibold">{fieldErrors.lines.join(" ")}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {lines.length < MAX_PAYMENT_LINES ? (
          <Button size="sm" icon="plus" onClick={add}>
            {PAYMENT_TEXT.addLine}
          </Button>
        ) : (
          <p className="text-small text-ink-2">{PAYMENT_TEXT.linesFull}</p>
        )}
        <p role="status" className="text-body ml-auto tabular-nums">
          {`${PAYMENT_TEXT.total} `}
          <b>{formatNpr(totalOf(lines))}</b>
        </p>
      </div>
    </fieldset>
  );
}

type LineFieldsProps = {
  line: LineDraft;
  /** 1 for the first line. */
  place: number;
  canRemove: boolean;
  choices: FeeTypeChoices;
  errorsOf: (field: "feeTypeId" | "note" | "amount") => string[] | undefined;
  onChange: (field: LineField, value: string) => void;
  onRemove: () => void;
};

/** One line: Fee Type and note (each a whole row on a phone), amount and remove. */
function LineFields(props: LineFieldsProps) {
  const { line, place, canRemove, choices, errorsOf, onChange, onRemove } = props;
  const isNoteNeeded = isOtherId(choices, idOf(line.feeTypeId));
  return (
    <div
      role="group"
      aria-label={PAYMENT_TEXT.line(place)}
      data-line-key={line.key}
      className="rounded-control border-rule bg-fill phone:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border p-4"
    >
      <div className="max-phone:col-span-2 min-w-0">
        <SelectField
          label={FEE_TYPE_TEXT.feeType}
          name="lineFeeTypeId"
          options={feeTypeOptions(choices)}
          value={line.feeTypeId}
          onChange={(value) => {
            onChange("feeTypeId", value);
          }}
          errors={errorsOf("feeTypeId") ?? loadErrorsOf(choices)}
        />
      </div>
      <div className="max-phone:col-span-2 min-w-0">
        <TextField
          label={FEE_TYPE_TEXT.note}
          name="lineNote"
          autoComplete="off"
          placeholder={FEE_TYPE_TEXT.notePlaceholder}
          isOptional={!isNoteNeeded}
          hint={isNoteNeeded ? FEE_TYPE_TEXT.noteNeeded : undefined}
          value={line.note}
          onChange={(value) => {
            onChange("note", value);
          }}
          errors={errorsOf("note")}
        />
      </div>
      <TextField
        label={PAYMENT_TEXT.amount}
        name="lineAmount"
        type="number"
        inputMode="numeric"
        min="1"
        value={line.amount}
        onChange={(value) => {
          onChange("amount", value);
        }}
        errors={errorsOf("amount")}
      />
      {canRemove && (
        <div className="grid content-start gap-2">
          <span aria-hidden="true" className={LABEL_CLASSES}>
            {" "}
          </span>
          <IconButton icon="trash" label={PAYMENT_TEXT.removeLine(place)} onClick={onRemove} />
        </div>
      )}
    </div>
  );
}

/** What the lines add up to so far; an amount that isn't a whole NPR yet counts as nothing. */
function totalOf(lines: readonly LineDraft[]): number {
  return lines.reduce(
    (sum, line) => sum + (isWholeAmount(line.amount.trim()) ? Number(line.amount) : 0),
    0,
  );
}

/**
 * The lines to send. Throws `InvalidFieldsError` naming each refused field as
 * `lines.<n>.<field>` (no Fee Type chosen, Other without a note, an amount that isn't a whole
 * NPR in range), so nothing is sent while one is wrong.
 */
export function readPaymentLines(
  lines: readonly LineDraft[],
  choices: FeeTypeChoices,
): NewPaymentLine[] {
  const errors: FieldErrors = {};
  const read = lines.map((line, index) => {
    const at = `lines.${String(index)}`;
    const feeTypeId = idOf(line.feeTypeId);
    const note = line.note.trim();
    const amount = line.amount.trim();
    if (feeTypeId === null) errors[`${at}.feeTypeId`] = [FEE_TYPE_TEXT.chooseRefused];
    else if (note === "" && isOtherId(choices, feeTypeId)) {
      errors[`${at}.note`] = [FEE_TYPE_TEXT.noteRefused];
    }
    if (!isWholeAmount(amount)) errors[`${at}.amount`] = [AMOUNT_MESSAGE];
    return { feeTypeId, note, amount: Number(amount) };
  });
  throwIfRefused(errors);
  return read;
}
