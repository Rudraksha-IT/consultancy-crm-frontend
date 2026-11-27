"use client";

import type { ChangeEvent } from "react";

import { Icon } from "./Icon";

/** The longest search the API accepts. */
const SEARCH_MAX_LENGTH = 100;

type SearchBoxProps = {
  /** Names the box for screen readers. */
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

/** A search box with its icon; it grows to fill the row it sits in. */
export function SearchBox({ label, placeholder, value, onChange }: SearchBoxProps) {
  return (
    <div className="phone:w-auto phone:flex-1 phone:basis-60 relative w-full min-w-0">
      <Icon
        name="search"
        className="text-ink-3 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
      />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        maxLength={SEARCH_MAX_LENGTH}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange(event.target.value);
        }}
        className="min-h-control rounded-control bg-fill text-input text-ink focus:border-accent focus:bg-paper w-full border border-transparent pr-3.5 pl-11.5"
      />
    </div>
  );
}
