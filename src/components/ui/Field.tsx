import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { LABELS } from "@/constants/messages";

import { describeField, FieldNote } from "./FieldNote";

/** What a field passes to its input, select or textarea. */
export type FieldControlProps = {
  id: string;
  required: boolean;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
  className: string;
};

export type FieldProps = {
  label: string;
  /** Guidance shown under the control while it has no errors. */
  hint?: string | undefined;
  /** The hint is good news (e.g. "Both match"): shown in the good colour with a tick. */
  isHintGood?: boolean | undefined;
  /** Messages explaining why the entered value was refused. */
  errors?: readonly string[] | undefined;
  /** Optional fields say so in their label; every other field is required. */
  isOptional?: boolean | undefined;
  /** The label is kept for screen readers only, when a heading above already names the field. */
  isLabelHidden?: boolean | undefined;
};

type FieldShellProps = FieldProps & {
  children: (control: FieldControlProps) => ReactNode;
};

export const CONTROL_CLASSES =
  "min-h-control max-phone:min-h-field-phone w-full min-w-0 rounded-control border border-rule-2 bg-paper px-3.5 text-body text-ink focus:border-accent aria-invalid:border-bad";

/** A visible label, the control, and its errors (or else its hint) as the control's description. */
export function Field({
  label,
  hint,
  isHintGood,
  errors,
  isOptional,
  isLabelHidden = false,
  children,
}: FieldShellProps) {
  const controlId = useId();
  const descriptionId = useId();
  const { shown, ref, dismiss } = useErrorsUntilEdited(errors);
  const description = describeField(shown, hint, isHintGood);
  const isRequired = isOptional !== true;

  return (
    // Changing the control hides its errors until the form is sent again (onInput: typing;
    // onChange: selects, dates and files).
    <div ref={ref} className="grid content-start gap-2" onInput={dismiss} onChange={dismiss}>
      <FieldLabel
        htmlFor={controlId}
        label={label}
        isOptional={!isRequired}
        isHidden={isLabelHidden}
      />
      {children({
        id: controlId,
        required: isRequired,
        "aria-invalid": description?.tone === "error" ? true : undefined,
        "aria-describedby": description === undefined ? undefined : descriptionId,
        className: CONTROL_CLASSES,
      })}
      <FieldNote id={descriptionId} description={description} />
    </div>
  );
}

/**
 * A field's errors, hidden once the person changes the control: the error was about the old
 * value. They show again when the form is sent again, when the message changes, or when they
 * clear and come back. Compared by text, as many screens build the list afresh each render.
 */
function useErrorsUntilEdited(errors: readonly string[] | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<string | null>(null);
  const text = errorText(errors);
  // Errors that clear and come back show again.
  if (text === "" && hidden !== null) setHidden(null);

  const showAgain = useCallback((): void => {
    setHidden(null);
  }, []);
  useOnFormSubmit(ref, showAgain);

  return {
    shown: text === hidden ? undefined : errors,
    ref,
    dismiss: (): void => {
      if (text !== "") setHidden(text);
    },
  };
}

/** The errors as one text to compare, or "" for none. */
function errorText(errors: readonly string[] | undefined): string {
  return errors === undefined ? "" : errors.join("\n");
}

/** Call `run` each time the form around `ref` is sent (there may be none). */
function useOnFormSubmit(ref: RefObject<HTMLElement | null>, run: () => void): void {
  useEffect(() => {
    const form = ref.current?.closest("form") ?? null;
    form?.addEventListener("submit", run);
    return () => {
      form?.removeEventListener("submit", run);
    };
  }, [ref, run]);
}

type FieldLabelProps = { htmlFor: string; label: string; isOptional: boolean; isHidden: boolean };

/** A field's visible label; also an empty spacer's, to line a button up with the controls. */
export const LABEL_CLASSES = "text-secondary text-ink font-semibold";

function FieldLabel({ htmlFor, label, isOptional, isHidden }: FieldLabelProps) {
  if (!isOptional) {
    return (
      <label htmlFor={htmlFor} className={isHidden ? "sr-only" : LABEL_CLASSES}>
        {label}
      </label>
    );
  }
  return (
    <label htmlFor={htmlFor} className={isHidden ? "sr-only" : LABEL_CLASSES}>
      {`${label} `}
      <span className="text-ink-2 font-normal">{LABELS.optional}</span>
    </label>
  );
}
