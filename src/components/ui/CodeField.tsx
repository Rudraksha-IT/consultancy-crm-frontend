"use client";

import clsx from "clsx";
import { useState } from "react";

import { Field, type FieldProps } from "./Field";

const CODE_LENGTH = 6;
const BOXES = Array.from({ length: CODE_LENGTH }, (_, index) => index);

type CodeFieldProps = FieldProps & {
  name: string;
};

/**
 * A 6-digit Code or number (issue 66): shown as six boxes, one per digit. Underneath it is one
 * input (the number keypad on phones, paste and one-time-code autofill work, read as one field);
 * only digits are kept, at most six.
 */
export function CodeField({ name, ...field }: CodeFieldProps) {
  const [digits, setDigits] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Field {...field}>
      {(control) => (
        <div className="relative max-w-sm">
          <div data-code-boxes aria-hidden="true" className="grid grid-cols-6 gap-2">
            {BOXES.map((index) => (
              <CodeBox
                key={index}
                digit={digits[index]}
                isCurrent={isFocused && index === Math.min(digits.length, CODE_LENGTH - 1)}
                isInvalid={control["aria-invalid"] === true}
              />
            ))}
          </div>
          <input
            id={control.id}
            required={control.required}
            aria-invalid={control["aria-invalid"]}
            aria-describedby={control["aria-describedby"]}
            className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
            name={name}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={digits}
            onChange={(event) => {
              setDigits(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
            }}
            onFocus={() => {
              setIsFocused(true);
            }}
            onBlur={() => {
              setIsFocused(false);
            }}
          />
        </div>
      )}
    </Field>
  );
}

type CodeBoxProps = { digit: string | undefined; isCurrent: boolean; isInvalid: boolean };

/** One digit's box: the digit, or a faint dot while empty; the box being typed in is marked. */
function CodeBox({ digit, isCurrent, isInvalid }: CodeBoxProps) {
  return (
    <span
      data-code-box
      className={clsx(
        "min-h-control-lg rounded-control bg-paper text-section-title text-ink grid place-items-center border tabular-nums",
        isInvalid ? "border-bad" : "border-rule-2",
        isCurrent && "outline-accent outline-3 outline-offset-1",
      )}
    >
      {digit ?? <span className="text-ink-3">·</span>}
    </span>
  );
}
