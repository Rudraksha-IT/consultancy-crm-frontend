"use client";

import type { RecordId } from "@/lib/recordId";
import clsx from "clsx";

import { Button } from "@/components/ui/Button";
import { EDIT_DETAILS_TEXT } from "@/constants/studentProfile";

import type { ListKind, RowValues } from "./listRows";

/** One row on the page: a stored row (with its id) or a new one, and whether it is marked. */
export type RowState = { key: string; id: RecordId | null; values: RowValues; isRemoved: boolean };

type EditRowsProps = {
  list: string;
  kind: ListKind;
  rows: readonly RowState[];
  errors: Partial<Record<string, string[]>>;
  onAdd: () => void;
  /** Mark a stored row to be removed on Save (or take the mark off); a new row just goes. */
  onToggle: (key: string) => void;
};

/**
 * A list on the Edit details page (issue 81): its rows, each with Remove, and an add button.
 * Removing only marks a row, with Undo; nothing is removed until Save, so no popup asks first.
 */
export function EditRows({ list, kind, rows, errors, onAdd, onToggle }: EditRowsProps) {
  const { Fields } = kind;
  return (
    <>
      {rows.length === 0 && <p className="text-secondary text-ink-2">{kind.none}</p>}
      {rows.map((row, index) => (
        <EditRow
          key={row.key}
          name={kind.rowName(index + 1)}
          row={row}
          prefix={`${list}.${row.key}`}
          Fields={Fields}
          errors={errors}
          onToggle={onToggle}
        />
      ))}
      <div>
        <Button size="sm" icon="plus" onClick={onAdd}>
          {kind.add}
        </Button>
      </div>
    </>
  );
}

type EditRowProps = {
  name: string;
  row: RowState;
  prefix: string;
  Fields: ListKind["Fields"];
  errors: Partial<Record<string, string[]>>;
  onToggle: (key: string) => void;
};

const LOOK = {
  kept: { box: "", fields: "", icon: "trash", label: EDIT_DETAILS_TEXT.remove },
  removed: {
    box: "bg-fill",
    fields: "opacity-60",
    icon: "restore",
    label: EDIT_DETAILS_TEXT.undo,
  },
} as const;

/** One row: its fields (greyed and left out of the save once marked), then Remove or Undo. */
function EditRow({ name, row, prefix, Fields, errors, onToggle }: EditRowProps) {
  const look = row.isRemoved ? LOOK.removed : LOOK.kept;
  return (
    <fieldset
      className={clsx("rounded-control border-rule grid min-w-0 gap-2 border p-4", look.box)}
    >
      <legend className="sr-only">{name}</legend>
      <fieldset disabled={row.isRemoved} className={clsx("min-w-0", look.fields)}>
        <Fields prefix={prefix} values={row.values} errors={rowErrors(errors, prefix)} />
      </fieldset>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {row.isRemoved && (
          <span className="text-small text-ink-2">{EDIT_DETAILS_TEXT.willBeRemoved}</span>
        )}
        <Button
          size="sm"
          variant="ghost"
          icon={look.icon}
          onClick={() => {
            onToggle(row.key);
          }}
        >
          {look.label}
        </Button>
      </div>
    </fieldset>
  );
}

/** The errors of one row's fields, still named as the form names them. */
function rowErrors(
  errors: Partial<Record<string, string[]>>,
  prefix: string,
): Partial<Record<string, string[]>> {
  return Object.fromEntries(
    Object.entries(errors).filter(([name]) => name.startsWith(`${prefix}.`)),
  );
}
