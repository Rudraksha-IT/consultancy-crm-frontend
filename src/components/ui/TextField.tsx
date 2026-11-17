import { useId } from "react";
import type {
  ReactNode,
  ChangeEvent,
  HTMLAttributes,
  HTMLInputAutoCompleteAttribute,
  HTMLInputTypeAttribute,
} from "react";

import { Field, type FieldProps } from "./Field";

type TextFieldProps = FieldProps & {
  name: string;
  type?: HTMLInputTypeAttribute;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  /** The phone keyboard to show, e.g. "numeric" for a year or "decimal" for a score. */
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  /** The earliest and latest allowed, for a date or month. */
  min?: string;
  max?: string;
  defaultValue?: string;
  /** Common values offered while typing; any other text is still allowed. */
  suggestions?: readonly string[];
  /** Set together with `onChange` to control the value. */
  value?: string;
  onChange?: (value: string) => void;
  /**
   * Fixed text shown after the input, e.g. `.crm.example.com` after an address's front part. Pass
   * "" while it loads: the input then keeps its place, so typing and focus aren't lost.
   */
  suffix?: string | undefined;
};

/** A labelled text input (text, email, tel, date, number or password). Required unless optional. */
export function TextField({
  name,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  min,
  max,
  defaultValue,
  suggestions,
  value,
  onChange,
  suffix,
  ...field
}: TextFieldProps) {
  const listId = useId();
  const hasSuggestions = suggestions !== undefined && suggestions.length > 0;

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onChange?.(event.target.value);
  }

  return (
    <Field {...field}>
      {(control) => (
        <WithSuffix suffix={suffix}>
          <input
            {...control}
            name={name}
            type={type}
            autoComplete={autoComplete}
            inputMode={inputMode}
            placeholder={placeholder}
            min={min}
            max={max}
            list={hasSuggestions ? listId : undefined}
            defaultValue={defaultValue}
            value={value}
            onChange={onChange && handleChange}
          />
          {hasSuggestions && (
            <datalist id={listId}>
              {suggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          )}
        </WithSuffix>
      )}
    </Field>
  );
}

/** The input with fixed text after it; wraps under it at narrow widths, never widening the page. */
function WithSuffix({ suffix, children }: { suffix: string | undefined; children: ReactNode }) {
  if (suffix === undefined) return children;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <div className="min-w-0 flex-1 basis-40">{children}</div>
      {suffix !== "" && <span className="text-ink-2 min-w-0 break-all">{suffix}</span>}
    </div>
  );
}
