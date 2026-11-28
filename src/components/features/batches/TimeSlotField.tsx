"use client";

import { useId, useState } from "react";

import { FieldNote, describeField } from "@/components/ui/FieldNote";
import { SelectField } from "@/components/ui/SelectField";
import { BATCH_TEXT } from "@/constants/batches";

import {
  DEFAULT_TIME_SLOT,
  endTimesAfter,
  formatTime,
  formatTimeSlot,
  keepEndAfterStart,
  parseTimeSlot,
  START_TIMES,
  type TimeSlot,
} from "./timeSlot";

type TimeSlotFieldProps = {
  name: string;
  /** The class's saved slot; empty for a new class. */
  saved: string;
  errors?: readonly string[] | undefined;
};

/** When the class meets, chosen as a start and an end time; sent as one slot, e.g. "7:00-8:30 AM". */
export function TimeSlotField({ name, saved, errors }: TimeSlotFieldProps) {
  const noteId = useId();
  const [slot, setSlot] = useState<TimeSlot>(() => parseTimeSlot(saved) ?? DEFAULT_TIME_SLOT);
  const oldText = saved !== "" && parseTimeSlot(saved) === undefined ? saved : undefined;
  const note = describeField(errors, oldText && BATCH_TEXT.timeSlotWas(oldText));

  return (
    <fieldset aria-describedby={note && noteId} className="grid content-start gap-2">
      {/* From and To say enough on screen (owner, 2026-11-28); the pair is named for screen readers. */}
      <legend className="sr-only">{BATCH_TEXT.timeSlot}</legend>
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label={BATCH_TEXT.timeFrom}
          name={`${name}From`}
          options={START_TIMES.map(toOption)}
          value={String(slot.from)}
          onChange={(from) => {
            setSlot(keepEndAfterStart({ from: Number(from), to: slot.to }));
          }}
        />
        <SelectField
          label={BATCH_TEXT.timeTo}
          name={`${name}To`}
          options={endTimesAfter(slot.from).map(toOption)}
          value={String(slot.to)}
          onChange={(to) => {
            setSlot({ from: slot.from, to: Number(to) });
          }}
        />
      </div>
      <input type="hidden" name={name} value={formatTimeSlot(slot)} />
      <FieldNote id={noteId} description={note} />
    </fieldset>
  );
}

function toOption(minutes: number) {
  return { value: String(minutes), label: formatTime(minutes) };
}
