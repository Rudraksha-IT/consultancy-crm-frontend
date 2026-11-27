import clsx from "clsx";
import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  /** Padded panels hold forms and text; unpadded ones hold lists and tables edge to edge. */
  isPadded?: boolean;
};

/**
 * A section's content under its title: a white sheet on the page (ticket 21), with a thin border,
 * 14 corners and a faint shadow in light, so what belongs together is seen at once. Rows and
 * table cells inside keep the sheet's padding from its sides (`px-gutter`: 18, phones 14); light
 * lines divide the rows. There is no line under the title. While a "More filters" panel is open
 * in it, the sheet lets it hang over its edge.
 */
export function Panel({ children, isPadded = false }: PanelProps) {
  return (
    <div
      data-panel=""
      className={clsx(
        "rounded-panel border-sheet-rule bg-paper shadow-raise min-w-0 overflow-hidden border has-data-filter-panel:overflow-visible",
        isPadded && "max-phone:px-gutter max-phone:py-4 grid gap-4 p-5",
      )}
    >
      {children}
    </div>
  );
}
