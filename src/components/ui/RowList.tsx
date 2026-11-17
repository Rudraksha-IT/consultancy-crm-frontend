import type { ReactNode } from "react";

type RowListProps = {
  label?: string;
  children: ReactNode;
};

/** A list of `RowItem`s with a rule between rows. */
export function RowList({ label, children }: RowListProps) {
  return (
    <ul aria-label={label} className="divide-rule divide-y">
      {children}
    </ul>
  );
}
