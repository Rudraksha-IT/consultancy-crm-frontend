import type { ChangeEvent } from "react";

import { Field, type FieldProps } from "./Field";

export type SelectOption = { value: string; label: string };

type SelectFieldProps = FieldProps & {
  name: string;
  options: readonly SelectOption[];
  defaultValue?: string;
  /** Set together with `onChange` to control the value. */
  value?: string;
  onChange?: (value: string) => void;
};

/** A labelled choice from a fixed list. */
export function SelectField({
  name,
  options,
  defaultValue,
  value,
  onChange,
  ...field
}: SelectFieldProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    onChange?.(event.target.value);
  }

  return (
    <Field {...field}>
      {(control) => (
        <select
          {...control}
          name={name}
          defaultValue={defaultValue}
          value={value}
          onChange={onChange && handleChange}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
