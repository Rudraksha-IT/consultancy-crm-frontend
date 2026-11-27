import clsx from "clsx";

/** The fixed colour a chosen option takes. Status tones never follow the Theme. */
export type ChoiceTone = "good" | "bad" | "warn" | "accent";

const CHOSEN_CLASSES: Record<ChoiceTone, string> = {
  good: "peer-checked:bg-good peer-checked:text-on-status",
  bad: "peer-checked:bg-bad peer-checked:text-on-status",
  warn: "peer-checked:bg-warn peer-checked:text-on-status",
  accent: "peer-checked:bg-accent peer-checked:text-accent-ink",
};

/** The most choices that fit one line of a phone as equal buttons. */
const ONE_LINE_MOST = 4;

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
 * On phones up to four choices are equal buttons on one line across the width (Attendance:
 * Present, Absent, Late, Leave); five or more would overlap there, so they wrap onto more lines.
 */
export function SegmentedChoice<Value extends string>({
  label,
  name,
  options,
  value,
  onChange,
}: SegmentedChoiceProps<Value>) {
  const fitsOneLine = options.length <= ONE_LINE_MOST;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={clsx(
        "rounded-control bg-fill-2 max-phone:w-full inline-flex flex-wrap gap-1 justify-self-start p-1",
        fitsOneLine && "max-phone:grid max-phone:grid-flow-col max-phone:auto-cols-fr",
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={clsx("min-w-0 cursor-pointer", !fitsOneLine && "max-phone:flex-auto")}
        >
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
              "rounded-control text-secondary text-ink-2 min-h-control phone:px-4 max-phone:justify-center flex items-center px-2.5 font-semibold whitespace-nowrap",
              fitsOneLine ? "max-phone:px-1" : "max-phone:px-3",
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
