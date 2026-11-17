"use client";

import type { SubmitEvent } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { readField } from "@/components/features/students/profile/formData";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { REPORTS_TEXT } from "@/constants/reports";
import type { DateRange } from "@/lib/api";

type RangeFormProps = {
  range: DateRange;
  fieldErrors: Partial<Record<string, string[]>>;
  onShow: (range: DateRange) => void;
};

/** From and to dates in the office's calendar; "Show" applies them. */
export function RangeForm({ range, fieldErrors, onShow }: RangeFormProps) {
  const dates = useDates();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onShow({ from: readField(form, "from"), to: readField(form, "to") });
  }

  return (
    <form
      noValidate
      aria-label={REPORTS_TEXT.range}
      onSubmit={handleSubmit}
      className="phone:grid-cols-[1fr_1fr_auto] grid w-full items-end gap-4"
    >
      <DateField
        label={REPORTS_TEXT.from}
        name="from"
        display={dates.display}
        defaultValue={range.from}
        errors={fieldErrors.from}
      />
      <DateField
        label={REPORTS_TEXT.to}
        name="to"
        display={dates.display}
        defaultValue={range.to}
        errors={fieldErrors.to}
      />
      <Button type="submit">{REPORTS_TEXT.show}</Button>
    </form>
  );
}
