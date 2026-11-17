import clsx from "clsx";

/** The fixed colour a chosen option takes. Status tones never follow the Theme. */
export type ChoiceTone = "good" | "bad" | "warn" | "accent";

const CHOSEN_CLASSES: Record<ChoiceTone, string> = {
  good: "peer-checked:bg-good peer-checked:text-on-status",
  bad: "peer-checked:bg-bad peer-checked:text-on-status",
  warn: "peer-checked:bg-warn peer-checked:text-on-status",
  accent: "peer-checked:bg-accent peer-checked:text-accent-ink",
};

type ChoiceOption<Value extends string> = { value: Value; label: string; tone?: ChoiceTone };

type SegmentedChoiceProps<Value extends string> = {
  /** Names the group for screen readers, e.g. "Attendance for Sita Gurung". */
  label: string;
  /** Unique on the page: the radios' group name. */
  name: string;
  options: readonly ChoiceOption<Value>[];
  /** The chosen value, or null while nothing is chosen. */
  value: Value | null;
  onChange: (value: Value) => void;
};

/**
 * Choosing one value from two to five, drawn like a segmented control: a radio group, so the
 * arrow keys move between choices. A chosen option takes its status colour, always beside its word.
 * On phones the choices are equal buttons on one line across the width (Attendance: Present,
 * Absent, Late, Leave).
 */
export function SegmentedChoice<Value extends string>({
  label,
  name,
  options,
  value,
  onChange,
}: SegmentedChoiceProps<Value>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="rounded-control bg-fill-2 max-phone:grid max-phone:w-full max-phone:grid-flow-col max-phone:auto-cols-fr inline-flex flex-wrap gap-1 justify-self-start p-1"
    >
      {options.map((option) => (
        <label key={option.value} className="min-w-0 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => {
              onChange(option.value);
            }}
            className="peer sr-only"
          />
          <span
            className={clsx(
              "rounded-control text-secondary text-ink-2 min-h-control phone:px-4 max-phone:justify-center max-phone:px-1 flex items-center px-2.5 font-semibold whitespace-nowrap",
              "peer-focus-visible:outline-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-solid",
              CHOSEN_CLASSES[option.tone ?? "accent"],
            )}
          >
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
