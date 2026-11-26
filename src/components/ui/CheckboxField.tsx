type CheckboxFieldProps = {
  label: string;
  name: string;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
};

/**
 * One tick box with its label; the whole row is the touch target (at least 44 px tall). A long
 * label with no spaces (a file's name) wraps inside its box instead of widening it.
 */
export function CheckboxField({ label, name, isChecked, onChange }: CheckboxFieldProps) {
  return (
    <label className="min-h-control rounded-control text-body hover:bg-fill -mx-2 inline-flex max-w-full min-w-0 cursor-pointer items-center gap-3 justify-self-start px-2">
      <input
        type="checkbox"
        name={name}
        checked={isChecked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="accent-accent size-5 flex-none"
      />
      <span className="min-w-0 wrap-anywhere">{label}</span>
    </label>
  );
}
