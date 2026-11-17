import clsx from "clsx";
import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  /** Padded panels hold forms and text; unpadded ones hold lists and tables edge to edge. */
  isPadded?: boolean;
};

/** The white box for lists, tables and forms. */
export function Panel({ children, isPadded = false }: PanelProps) {
  return (
    <div
      className={clsx(
        "rounded-panel border-rule bg-paper shadow-raise min-w-0 overflow-hidden border",
        isPadded && "grid gap-5 p-6",
      )}
    >
      {children}
    </div>
  );
}
