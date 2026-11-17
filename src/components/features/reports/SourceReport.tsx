"use client";

import { BarList } from "@/components/ui/BarList";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { REPORTS_TEXT, ReportTab } from "@/constants/reports";
import { SOURCE_LABELS } from "@/constants/students";
import type { SourceReport as SourceCounts } from "@/lib/api";

import { ReportBody } from "./ReportState";
import type { ReportState } from "./useReport";

/** How many new visitors each Source brought between the dates, most first (spec 94). */
export function SourceReport({ state }: { state: ReportState<SourceCounts> }) {
  return (
    <ReportBody state={state}>
      {(report) => (
        <Panel>
          <BarList
            label={REPORTS_TEXT.tabs[ReportTab.Sources]}
            rows={report.sources.map((row) => ({
              label: SOURCE_LABELS[row.source],
              value: row.count,
            }))}
          />
          <PanelFoot>{REPORTS_TEXT.sourcesFoot(report.total)}</PanelFoot>
        </Panel>
      )}
    </ReportBody>
  );
}
