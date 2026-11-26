"use client";

import type { ReactNode } from "react";

import { LABELS } from "@/constants/messages";

import { Button } from "./Button";
import { useChartView } from "./ChartViews";
import { Panel } from "./Panel";
import { Section } from "./Section";

type ChartSectionProps = {
  /** The section's title; the chart's choice is remembered under it. */
  title: string;
  /** No switch when there is nothing to chart (an empty state). */
  hasSwitch?: boolean;
  /** The sheet's content: the chart, or its table when `showsTable`. */
  children: (showsTable: boolean) => ReactNode;
};

/** "Show as a table", or "Show as a chart" (pressed) while the table is shown. */
function ChartSwitch({ showsTable, onToggle }: { showsTable: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={showsTable ? "chart" : "list"}
      isPressed={showsTable}
      onClick={onToggle}
    >
      {showsTable ? LABELS.showAsChart : LABELS.showAsTable}
    </Button>
  );
}

/**
 * A chart on its sheet, with "Show as a table" on the title's line, at its right, on every width
 * (UI revamp 15). The button swaps the chart for its table and back; it stays where it is, so the
 * cursor stays on it. Each chart keeps its own choice.
 */
export function ChartSection({ title, hasSwitch = true, children }: ChartSectionProps) {
  const { showsTable, toggle } = useChartView(title);
  return (
    <Section
      title={title}
      keepsAsideBesideTitle
      aside={hasSwitch ? <ChartSwitch showsTable={showsTable} onToggle={toggle} /> : undefined}
    >
      <Panel>{children(hasSwitch && showsTable)}</Panel>
    </Section>
  );
}
