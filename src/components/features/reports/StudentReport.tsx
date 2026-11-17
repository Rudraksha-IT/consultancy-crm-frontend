"use client";

import { useCallback } from "react";

import { BarChart } from "@/components/ui/BarChart";
import { BarList } from "@/components/ui/BarList";
import { ColumnChart } from "@/components/ui/ColumnChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { Section } from "@/components/ui/Section";
import { formatPlainNumber } from "@/components/ui/chartTypes";
import { REPORTS_TEXT } from "@/constants/reports";
import {
  fetchStudentReport,
  type CountryCount,
  type MonthCount,
  type StudentReport as StudentReportAnswer,
} from "@/lib/api";
import { shareOf } from "@/lib/charts";
import { countryRows, monthCategories, topCountries, totalOf } from "@/lib/reports";

import { ReportBody } from "./ReportState";
import { useReport } from "./useReport";

/**
 * Totals, the monthly chart, the countries and "What happened to them" over the last 6 or 12
 * months.
 */
export function StudentReport({ months }: { months: MonthCount }) {
  const load = useCallback(() => fetchStudentReport(months), [months]);
  const state = useReport(load);
  return (
    <ReportBody state={state}>
      {(report) => <StudentCharts report={report} months={months} />}
    </ReportBody>
  );
}

function StudentCharts({ report, months }: { report: StudentReportAnswer; months: MonthCount }) {
  const rows = report.months;
  const totals = totalOf(rows);
  const text = REPORTS_TEXT;
  return (
    <>
      <TileGrid>
        <FigureTile
          label={text.newVisitors}
          value={formatPlainNumber(totals.newVisitors)}
          footnote={text.inTheLast(months)}
        />
        <FigureTile
          label={text.signedUp}
          value={formatPlainNumber(totals.signedUp)}
          footnote={text.ofVisitors(shareOf(totals.signedUp, totals.newVisitors))}
        />
        <FigureTile
          label={text.visasGranted}
          value={formatPlainNumber(totals.visasGranted)}
          footnote={text.ofVisaDecisions(
            shareOf(totals.visasGranted, totals.visasGranted + totals.visasRefused),
          )}
        />
      </TileGrid>
      <Section title={text.eachMonth}>
        <Panel>
          <ColumnChart
            title={text.eachMonth}
            categories={monthCategories(rows.map((row) => row.month))}
            series={[
              { name: text.series.newVisitors, values: rows.map((row) => row.newVisitors) },
              { name: text.series.signedUp, values: rows.map((row) => row.signedUp) },
              { name: text.series.visasGranted, values: rows.map((row) => row.visasGranted) },
            ]}
          />
        </Panel>
      </Section>
      <div className="wide:grid-cols-2 grid items-start gap-8">
        <Section title={text.countries.granted}>
          <Panel>
            <CountryChart
              title={text.countries.granted}
              seriesName={text.countries.grantedSeries}
              counts={report.visasGrantedByCountry}
              empty={text.countries.noneGranted}
            />
            <PanelFoot>{text.countries.grantedFoot}</PanelFoot>
          </Panel>
        </Section>
        <Section title={text.countries.wanted}>
          <Panel>
            <CountryChart
              title={text.countries.wanted}
              seriesName={text.countries.wantedSeries}
              counts={report.countriesWanted}
              empty={text.countries.nobodyCame}
            />
            <PanelFoot>{text.countries.wantedFoot(months)}</PanelFoot>
          </Panel>
        </Section>
      </div>
      <Section title={text.whatHappened}>
        <Panel>
          <BarList
            label={text.whatHappened}
            rows={[
              {
                label: text.funnel.cameIn,
                value: totals.newVisitors,
                note: text.funnel.cameInNote,
              },
              {
                label: text.funnel.signedUp,
                value: totals.signedUp,
                note: text.funnel.signedUpNote,
              },
              { label: text.funnel.applied, value: totals.applied, note: text.funnel.appliedNote },
              { label: text.funnel.gotVisa, value: totals.visasGranted },
              { label: text.funnel.refused, value: totals.visasRefused, isMuted: true },
              {
                label: text.funnel.stopped,
                value: totals.lost,
                note: text.funnel.stoppedNote,
                isMuted: true,
              },
            ]}
          />
          <PanelFoot>{text.funnelFoot(months)}</PanelFoot>
        </Panel>
      </Section>
    </>
  );
}

type CountryChartProps = {
  title: string;
  seriesName: string;
  counts: readonly CountryCount[];
  empty: string;
};

/** The top ten countries as bars, the rest under Other; the table lists every country. */
function CountryChart({ title, seriesName, counts, empty }: CountryChartProps) {
  if (counts.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <BarChart
      title={title}
      seriesName={seriesName}
      categoryHeading={REPORTS_TEXT.countries.country}
      rows={topCountries(counts)}
      tableRows={countryRows(counts)}
    />
  );
}
