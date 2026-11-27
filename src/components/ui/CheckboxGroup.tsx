import { useId } from "react";

import { LABELS } from "@/constants/messages";

import { describeField, FieldNote, type FieldDescription } from "./FieldNote";
import type { SelectOption } from "./SelectField";
import { LABEL_CLASSES } from "./Field";

type CheckboxGroupProps = {
  label: string;
  name: string;
  options: readonly SelectOption[];
  /** The ticked values. */
  values: readonly string[];
  /** Called with the ticked values, in the options' order. */
  onChange: (values: string[]) => void;
  hint?: string;
  errors?: readonly string[] | undefined;
  isOptional?: boolean;
};

/** A labelled set of tick boxes for choosing several values from a short fixed list. */
export function CheckboxGroup({
  label,
  name,
  options,
  values,
  onChange,
  hint,
  errors,
  isOptional = false,
}: CheckboxGroupProps) {
  const descriptionId = useId();
  const description = describeField(errors, hint);

  function toggle(value: string, isTicked: boolean): void {
    const ticked = new Set(values);
    if (isTicked) ticked.add(value);
    else ticked.delete(value);
    onChange(options.map((option) => option.value).filter((option) => ticked.has(option)));
  }

  return (
    <fieldset {...describedBy(description, descriptionId)} className="grid content-start gap-2">
      <GroupLegend label={label} isOptional={isOptional} />
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="min-h-control rounded-control text-body hover:bg-fill inline-flex cursor-pointer items-center gap-2.5 px-2"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={values.includes(option.value)}
              onChange={(event) => {
                toggle(option.value, event.target.checked);
              }}
              className="accent-accent size-5 flex-none"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldNote id={descriptionId} description={description} />
    </fieldset>
  );
}

function GroupLegend({ label, isOptional }: { label: string; isOptional: boolean }) {
  return (
    <legend className={`${LABEL_CLASSES} mb-2`}>
      {label}
      {isOptional && <span className="text-ink-2 font-normal"> {LABELS.optional}</span>}
    </legend>
  );
}

function describedBy(description: FieldDescription | undefined, id: string) {
  if (description === undefined) return {};
  return {
    "aria-describedby": id,
    ...(description.tone === "error" ? { "aria-invalid": true } : {}),
  };
}
