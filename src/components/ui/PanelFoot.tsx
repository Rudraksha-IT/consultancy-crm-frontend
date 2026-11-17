import type { ReactNode } from "react";

/** A quiet line at the bottom of a Panel, e.g. what a list or chart counts. */
export function PanelFoot({ children }: { children: ReactNode }) {
  return (
    <div className="border-rule bg-fill text-secondary text-ink-2 border-t px-6 py-4">
      {children}
    </div>
  );
}
