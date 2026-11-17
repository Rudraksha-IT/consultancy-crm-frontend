import clsx from "clsx";
import type { ChangeEvent } from "react";

import { Field, type FieldProps } from "./Field";

type FileFieldProps = FieldProps & {
  name: string;
  /** The file types offered, e.g. ".csv". The server checks the file again. */
  accept?: string;
  /** Several files may be chosen at once. */
  multiple?: boolean;
  /** Told the first chosen file, or null. */
  onChange?: (file: File | null) => void;
  /** Told every chosen file, in order. */
  onFilesChange?: (files: File[]) => void;
};

/** A labelled input for choosing one file (or several) from the computer. */
export function FileField(props: FileFieldProps) {
  const { name, accept, multiple = false, onChange, onFilesChange, ...field } = props;
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const chosen = Array.from(event.target.files ?? []);
    onChange?.(chosen[0] ?? null);
    onFilesChange?.(chosen);
  }

  return (
    <Field {...field}>
      {({ className, ...control }) => (
        <input
          {...control}
          type="file"
          name={name}
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className={clsx(
            className,
            "text-secondary text-ink-2 file:rounded-control file:bg-fill-2 file:text-ink cursor-pointer py-2 file:mr-3 file:cursor-pointer file:border-0 file:px-3 file:py-1.5 file:font-semibold",
          )}
        />
      )}
    </Field>
  );
}
