import clsx from "clsx";

import { Field, type FieldProps } from "./Field";
import { useSubmitKeysHintId } from "./SubmitKeys";
import { useSubmitKeys } from "./useSubmitKeys";

type TextAreaFieldProps = FieldProps & {
  name: string;
  placeholder?: string;
  defaultValue?: string;
  /** How many lines show before it scrolls. */
  rows?: number;
  /** Told the text after each change, e.g. to count characters. */
  onChange?: (value: string) => void;
  /** Escape cancels, e.g. editing the Note; left out, Escape is left alone. */
  onEscape?: () => void;
};

/**
 * A labelled box for several lines of text, such as a Student's Note. Enter makes a new line and
 * Ctrl + Enter (⌘ + Enter) saves its form; inside a SubmitKeysScope it is also described by the
 * hint beside the Save button.
 */
export function TextAreaField({
  name,
  placeholder,
  defaultValue,
  rows = 4,
  onChange,
  onEscape,
  ...field
}: TextAreaFieldProps) {
  const handleKeyDown = useSubmitKeys({ onEscape });
  const hintId = useSubmitKeysHintId();
  return (
    <Field {...field}>
      {({ className, ...control }) => (
        <textarea
          {...control}
          aria-describedby={joinIds(control["aria-describedby"], hintId)}
          onKeyDown={handleKeyDown}
          name={name}
          rows={rows}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onChange={
            onChange === undefined
              ? undefined
              : (event) => {
                  onChange(event.target.value);
                }
          }
          className={clsx(className, "resize-y py-3")}
        />
      )}
    </Field>
  );
}

/** Space-separated ids for `aria-describedby`, or undefined when there are none. */
function joinIds(...ids: (string | undefined)[]): string | undefined {
  const joined = ids.filter((id) => id !== undefined).join(" ");
  return joined === "" ? undefined : joined;
}
