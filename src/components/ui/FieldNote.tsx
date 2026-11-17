import clsx from "clsx";

import { Icon } from "./Icon";

export type FieldDescription = { text: string; tone: "hint" | "good" | "error" };

type FieldNoteProps = {
  id: string;
  description: FieldDescription | undefined;
};

const TONE_CLASSES: Record<FieldDescription["tone"], string> = {
  hint: "text-ink-2",
  good: "text-good flex items-center gap-1.5",
  error: "text-bad font-semibold",
};

/** The hint or error text under a form field, referenced by the field's `aria-describedby`. */
export function FieldNote({ id, description }: FieldNoteProps) {
  if (description === undefined) return null;
  return (
    <span id={id} className={clsx("text-small", TONE_CLASSES[description.tone])}>
      {description.tone === "good" && <Icon name="check" size="sm" />}
      {description.text}
    </span>
  );
}

/** The field's errors if it has any, otherwise its hint (good news gets a tick), or nothing. */
export function describeField(
  errors: readonly string[] | undefined,
  hint: string | undefined,
  isHintGood?: boolean,
): FieldDescription | undefined {
  const errorText = (errors ?? []).join(" ");
  if (errorText !== "") return { text: errorText, tone: "error" };
  if (hint === undefined) return undefined;
  return { text: hint, tone: hintTone(isHintGood) };
}

function hintTone(isGood: boolean | undefined): FieldDescription["tone"] {
  return isGood === true ? "good" : "hint";
}
