"use client";

import { useCallback } from "react";

import { BarList } from "@/components/ui/BarList";
import { ColumnChart } from "@/components/ui/ColumnChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { EXPENSE_CATEGORY_LABELS } from "@/constants/expenses";
import { REPORTS_TEXT } from "@/constants/reports";
import { fetchMoneyReport, type MoneyReport as MoneyAnswer, type MonthCount } from "@/lib/api";
import { formatNpr } from "@/lib/money";
import { formatLakh, moneyTotalsOf, monthCategories } from "@/lib/reports";

import { ReportBody } from "./ReportState";
import { useReport } from "./useReport";

const TEXT = REPORTS_TEXT.money;

/**
 * Money over the last 6 or 12 months (spec 97): money in (Payments and Commission received),
 * money out (Expenses) and what is left over; a monthly chart of in against out; where the money
 * came from (each Fee Type, then Commission; issue 06) and where it went.
 */
export function MoneyReport({ months }: { months: MonthCount }) {
  const load = useCallback(() => fetchMoneyReport(months), [months]);
  const state = useReport(load);
  return (
    <ReportBody state={state}>
      {(report) => <MoneyCharts report={report} months={months} />}
    </ReportBody>
  );
}

function MoneyCharts({ report, months }: { report: MoneyAnswer; months: MonthCount }) {
  const { months: rows, moneyOutByCategory, moneyInByFeeType } = report;
  const totals = moneyTotalsOf(rows);
  const isShort = totals.leftOver < 0;
  return (
    <>
      <TileGrid>
        <FigureTile
          label={TEXT.moneyIn}
          value={formatNpr(totals.moneyIn)}
          footnote={TEXT.lastMonths(months)}
        />
        <FigureTile
          label={TEXT.moneyOut}
          value={formatNpr(totals.moneyOut)}
          footnote={TEXT.expenses}
        />
        <FigureTile
          label={isShort ? TEXT.shortBy : TEXT.leftOver}
          value={formatNpr(Math.abs(totals.leftOver))}
          footnote={TEXT.inMinusOut}
          {...(isShort && { tone: "bad" as const })}
        />
      </TileGrid>
      <Section title={TEXT.eachMonth}>
        <Panel>
          <ColumnChart
            title={TEXT.eachMonth}
            categories={monthCategories(rows.map((row) => row.month))}
            format={formatNpr}
            axisFormat={formatLakh}
            series={[
              {
                name: TEXT.moneyIn,
                values: rows.map((row) => row.fromStudents + row.fromCommission),
              },
              { name: TEXT.moneyOut, values: rows.map((row) => row.moneyOut) },
            ]}
          />
        </Panel>
      </Section>
      <div className="wide:grid-cols-2 grid items-start gap-8">
        <Section title={TEXT.cameFrom}>
          <Panel>
            <BarList
              label={TEXT.cameFrom}
              format={formatNpr}
              rows={[
                ...fromStudentsRows(moneyInByFeeType, totals.fromStudents),
                { key: "commission", label: TEXT.commission, value: totals.fromCommission },
              ]}
            />
          </Panel>
        </Section>
        <Section title={TEXT.went}>
          <Panel>
            {moneyOutByCategory.length === 0 ? (
              <EmptyState>{TEXT.nothingWent}</EmptyState>
            ) : (
              <BarList
                label={TEXT.went}
                format={formatNpr}
                rows={moneyOutByCategory.map((row) => ({
                  key: row.category,
                  label: EXPENSE_CATEGORY_LABELS[row.category],
                  value: row.amount,
                }))}
              />
            )}
          </Panel>
        </Section>
      </div>
    </>
  );
}

/** Payments from Students by Fee Type, largest first; one "Student fees" row when there are none. */
function fromStudentsRows(byFeeType: MoneyAnswer["moneyInByFeeType"], fromStudents: number) {
  if (byFeeType.length === 0) {
    return [{ key: "students", label: TEXT.studentFees, value: fromStudents }];
  }
  return byFeeType.map((row) => ({
    key: `fee-type-${String(row.feeType.id)}`,
    label: row.feeType.name,
    value: row.amount,
  }));
}
