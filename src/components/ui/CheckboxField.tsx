type CheckboxFieldProps = {
  label: string;
  name: string;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
};

/** One tick box with its label; the whole row is the touch target (at least 44 px tall). */
export function CheckboxField({ label, name, isChecked, onChange }: CheckboxFieldProps) {
  return (
    <label className="min-h-control rounded-control hover:bg-fill -mx-2 inline-flex cursor-pointer items-center gap-3 justify-self-start px-2">
      <input
        type="checkbox"
        name={name}
        checked={isChecked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="accent-accent size-5 flex-none"
      />
      {label}
    </label>
  );
}
