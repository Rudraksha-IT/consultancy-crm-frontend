"use client";

import type { ChangeEvent } from "react";

import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { LABELS } from "@/constants/messages";

type ColourPickerProps = {
  label: string;
  name: string;
  value: string;
  presets: readonly { label: string; hex: string }[];
  onChange: (value: string) => void;
  /** Choices before the presets that aren't colours, such as "Automatic". */
  leadingOptions?: readonly SelectOption[];
  /** The colour the custom picker starts from when `value` isn't a colour. */
  fallbackHex: string;
};

/** A colour from a list of presets, or any colour from the browser's colour picker. */
export function ColourPicker({
  label,
  name,
  value,
  presets,
  onChange,
  leadingOptions = [],
  fallbackHex,
}: ColourPickerProps) {
  const options: SelectOption[] = [
    ...leadingOptions,
    ...presets.map((preset) => ({ value: preset.hex, label: preset.label })),
  ];
  const isListed = options.some((option) => option.value === value);
  const customHex = value.startsWith("#") ? value : fallbackHex;

  function handleCustom(event: ChangeEvent<HTMLInputElement>): void {
    onChange(event.target.value);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <SelectField
        label={label}
        name={name}
        value={value}
        onChange={onChange}
        options={isListed ? options : [...options, { value, label: LABELS.customColour(value) }]}
      />
      <input
        type="color"
        aria-label={LABELS.customColourOf(label)}
        value={customHex}
        onChange={handleCustom}
        className="h-control rounded-control border-rule-2 bg-paper w-12 cursor-pointer border p-0.5"
      />
    </div>
  );
}
