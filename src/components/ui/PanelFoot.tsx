import type { ReactNode } from "react";

/** A quiet line at the bottom of a Panel, e.g. what a list or chart counts. */
export function PanelFoot({ children }: { children: ReactNode }) {
  return (
    <div className="border-rule text-secondary text-ink-2 px-gutter border-t py-3">{children}</div>
  );
}
