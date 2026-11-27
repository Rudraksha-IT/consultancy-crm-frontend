import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";

/**
 * An empty part of Home's desk column (UI revamp 07): from 1280 it stays as tall as two rows, so
 * a quiet day does not collapse the column and Home keeps its shape.
 */
export function DeskEmpty({ children }: { children: ReactNode }) {
  return (
    <Panel>
      <div data-desk-empty="" className="desk:min-h-desk-empty desk:grid desk:place-content-center">
        <EmptyState>{children}</EmptyState>
      </div>
    </Panel>
  );
}
