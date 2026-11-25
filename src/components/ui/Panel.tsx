import clsx from "clsx";
import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  /** Padded panels hold forms and text; unpadded ones hold lists and tables edge to edge. */
  isPadded?: boolean;
};

/**
 * A section's content under its title, with no box around it (Ivory, ticket 03): a strong line
 * (2px, ink 55%) on top divides the title from the content, and light lines divide the rows. The
 * panel is pulled out by the row gutter, so the text inside lines up with the title above. No
 * strong line where mini tabs, a toolbar holding tabs or figure boxes already sit above it
 * (globals.css, "Section lines").
 */
export function Panel({ children, isPadded = false }: PanelProps) {
  return (
    <div
      data-panel=""
      className={clsx(
        "border-rule-strong -mx-gutter min-w-0 border-t-2",
        isPadded && "px-gutter grid gap-4 pt-4.5",
      )}
    >
      {children}
    </div>
  );
}
