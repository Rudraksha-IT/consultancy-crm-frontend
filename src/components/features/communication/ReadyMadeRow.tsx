"use client";

import { Banner } from "@/components/ui/Banner";
import { SelectField } from "@/components/ui/SelectField";
import {
  COMMUNICATION_TEXT as TEXT,
  READY_MADE,
  READY_MADE_KINDS,
  READY_MADE_RECORD_LABELS,
  type ReadyMadeKind,
} from "@/constants/communication";
import type { ReadyMadeEntry } from "@/lib/api";

import type { ComposerText } from "./useComposerText";

/**
 * The Email row (ticket 09): one of the ready-made emails, those that can't be used greyed out with
 * the reason, and beside it the record it is about (a Payment, an Offer Letter, a Visa or a class).
 */
export function ReadyMadeRow({ text }: { text: ComposerText }) {
  const { menu, choice } = text;
  if (menu.status === "loading") return null;
  if (menu.status === "failed") return <Banner tone="warning">{TEXT.readyMadeFailed}</Banner>;
  const chosen = menu.entries.find((entry) => entry.kind === choice.kind);
  return (
    <div className="phone:grid-cols-2 grid gap-4">
      <SelectField
        label={TEXT.readyMade}
        name="ready_made"
        value={choice.kind}
        onChange={(value) => {
          text.choose(kindOf(value));
        }}
        options={menu.entries.map((entry) => ({
          value: entry.kind,
          label: TEXT.readyMadeOption(READY_MADE[entry.kind].name, entry.unavailable),
          isDisabled: entry.unavailable !== null,
        }))}
        hint={TEXT.readyMadeHint(READY_MADE[choice.kind].what)}
      />
      {chosen !== undefined && <RecordPicker entry={chosen} text={text} />}
      {text.hasDraftFailed && (
        <div className="phone:col-span-2">
          <Banner tone="problem">{TEXT.draftFailed}</Banner>
        </div>
      )}
    </div>
  );
}

/** The record the chosen email is about, when it needs one. */
function RecordPicker({ entry, text }: { entry: ReadyMadeEntry; text: ComposerText }) {
  const { record } = text.choice;
  if (entry.record === null || record === null) return null;
  return (
    <SelectField
      label={READY_MADE_RECORD_LABELS[entry.record]}
      name="record"
      value={String(record)}
      onChange={(value) => {
        text.pick(Number(value));
      }}
      options={entry.records.map((each) => ({ value: String(each.id), label: each.label }))}
    />
  );
}

/** The kind picked from the list (always one of those offered). */
function kindOf(value: string): ReadyMadeKind {
  return READY_MADE_KINDS.find((kind) => kind === value) ?? "plain";
}
