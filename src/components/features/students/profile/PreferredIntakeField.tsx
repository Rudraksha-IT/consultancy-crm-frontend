"use client";

import { useEffect, useState } from "react";

import { SelectField } from "@/components/ui/SelectField";
import { LABELS } from "@/constants/messages";
import { PROFILE_TEXT } from "@/constants/studentProfile";
import { fetchUpcomingIntakes } from "@/lib/api";
import { formatIntake } from "@/lib/dates";

type PreferredIntakeFieldProps = {
  /** The Intake stored now ("YYYY-MM"), or "" for not decided. */
  stored: string;
  errors: readonly string[] | undefined;
};

/**
 * A Student's preferred Intake: one of the Catalogue's upcoming Intakes, or "Not decided"
 * (spec 145). The one stored stays offered even once the Catalogue no longer lists it.
 */
export function PreferredIntakeField({ stored, errors }: PreferredIntakeFieldProps) {
  const upcoming = useUpcomingIntakes();
  const [value, setValue] = useState(stored);
  const months = [...new Set([...upcoming, ...(stored === "" ? [] : [stored])])].sort();
  return (
    <SelectField
      label={LABELS.preferredIntake}
      name="preferredIntake"
      options={[
        { value: "", label: PROFILE_TEXT.notDecided },
        ...months.map((month) => ({ value: month, label: formatIntake(month) })),
      ]}
      value={value}
      onChange={setValue}
      isOptional
      errors={errors}
    />
  );
}

/** The Catalogue's upcoming Intakes; none until they arrive, or if they can't be loaded. */
function useUpcomingIntakes(): string[] {
  const [intakes, setIntakes] = useState<string[]>([]);
  useEffect(() => {
    let isCancelled = false;
    fetchUpcomingIntakes().then(
      (found) => {
        if (!isCancelled) setIntakes(found);
      },
      () => {
        // The stored Intake and "Not decided" are still offered.
      },
    );
    return () => {
      isCancelled = true;
    };
  }, []);
  return intakes;
}
