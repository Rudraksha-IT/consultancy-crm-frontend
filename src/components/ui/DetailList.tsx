import clsx from "clsx";
import type { ReactNode } from "react";

export type DetailItem = { label: string; value: ReactNode };

type DetailListProps = {
  items: readonly DetailItem[];
  /** No padding of its own, e.g. inside a receipt that has its own. */
  isFlush?: boolean;
};

/** Labels and their values, such as a Student's contact details. An empty value shows a dash. */
export function DetailList({ items, isFlush = false }: DetailListProps) {
  return (
    <dl
      className={clsx(
        "tablet:grid-cols-[minmax(0,var(--spacing-field-label))_minmax(0,1fr)] tablet:gap-y-4 grid gap-x-6 gap-y-1",
        !isFlush && "p-6",
      )}
    >
      {items.map(({ label, value }) => (
        <div key={label} className="tablet:contents tablet:pb-0 grid gap-1 pb-3">
          <dt className="text-ink-2">{label}</dt>
          <dd className="min-w-0 font-semibold break-words">
            {value === "" || value === null ? "—" : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
