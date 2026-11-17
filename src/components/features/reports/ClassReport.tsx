"use client";

import { BarList } from "@/components/ui/BarList";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { REPORTS_TEXT, ReportTab } from "@/constants/reports";
import type { ClassReportRow } from "@/lib/api";

import { ReportBody } from "./ReportState";
import type { ReportState } from "./useReport";

/**
 * Each class running between the dates, with its Students and Teacher, and the share of class
 * days its Students attended (spec 98). A class nobody was marked in shows "—", not 0%.
 */
export function ClassReport({ state }: { state: ReportState<ClassReportRow[]> }) {
  return (
    <ReportBody state={state}>
      {(rows) => (
        <Panel>
          {rows.length === 0 ? (
            <EmptyState>{REPORTS_TEXT.noClasses}</EmptyState>
          ) : (
            <BarList
              label={REPORTS_TEXT.tabs[ReportTab.Classes]}
              rows={rows.map((row) => ({
                key: row.id,
                label: row.name,
                note: REPORTS_TEXT.classNote(row.students, row.teacher),
                value: row.attendedPercent ?? 0,
                valueText:
                  row.attendedPercent === null
                    ? REPORTS_TEXT.noShare
                    : REPORTS_TEXT.percent(row.attendedPercent),
              }))}
            />
          )}
          <PanelFoot>{REPORTS_TEXT.classesFoot}</PanelFoot>
        </Panel>
      )}
    </ReportBody>
  );
}
