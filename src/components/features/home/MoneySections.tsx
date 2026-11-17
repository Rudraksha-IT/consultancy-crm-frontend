"use client";

import Link from "next/link";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { COMMISSION_TEXT } from "@/constants/commission";
import { EXPENSE_TEXT } from "@/constants/expenses";
import { FEE_TEXT, OWING_ON_HOME } from "@/constants/fees";
import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import {
  fetchCommission,
  fetchExpenses,
  fetchOwingStudents,
  fetchPayments,
  fetchReceivedCommission,
  type CommissionPage,
  type ExpensePage,
  type OwingPage,
  type PaymentPage,
  type ReceivedCommission,
} from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { formatNpr, paidShare } from "@/lib/money";

import { useLoaded, type Loaded } from "./useLoaded";

/** The first day of this month, "YYYY-MM-01" (AD). */
function startOfMonth(): string {
  return `${todayIso().slice(0, "YYYY-MM".length)}-01`;
}

/** What this month's glance needs besides the Fees: money in, money out and Commission. */
type ThisMonth = {
  payments: PaymentPage;
  commissionReceived: ReceivedCommission;
  expenses: ExpensePage;
  commission: CommissionPage;
};

async function loadThisMonth(): Promise<ThisMonth> {
  const days = { from: startOfMonth(), to: todayIso() };
  // Expenses use the server's this month; one page is enough for its total.
  const [payments, commissionReceived, expenses, commission] = await Promise.all([
    fetchPayments({ ...days, search: "", purpose: "", studentId: null }, 1),
    fetchReceivedCommission(days),
    fetchExpenses(null, 1),
    fetchCommission(1),
  ]);
  return { payments, commissionReceived, expenses, commission };
}

export function loadOwing(): Promise<OwingPage> {
  return fetchOwingStudents(1);
}

const ACCOUNTS_LINK = "min-h-control inline-flex items-center";

/**
 * This month at a glance on the Admin's Home (spec 22a), with the Accounts Module: profit (money
 * in minus money out), money in from Students and Received Commission, money out (Expenses), the
 * Fees still to collect, and the Commission still to come from universities.
 */
export function MonthAtAGlance({ owing }: { owing: Loaded<OwingPage> }) {
  const month = useLoaded(loadThisMonth, 0);
  return (
    <Section
      title={FEE_TEXT.atAGlance}
      aside={
        <Link href={ROUTES.accounts} className={ACCOUNTS_LINK}>
          {FEE_TEXT.openAccounts}
        </Link>
      }
    >
      <GlanceBody owing={owing} month={month} />
    </Section>
  );
}

type GlanceBodyProps = { owing: Loaded<OwingPage>; month: Loaded<ThisMonth> };

function GlanceBody({ owing, month }: GlanceBodyProps) {
  if (owing.status === "loaded" && month.status === "loaded") {
    return <GlanceFigures owing={owing.data} month={month.data} />;
  }
  const hasFailed = owing.status === "failed" || month.status === "failed";
  if (hasFailed) return <Banner tone="problem">{FEE_TEXT.glanceFailed}</Banner>;
  return <p className="text-ink-2">{MESSAGES.loading}</p>;
}

function GlanceFigures({ owing, month }: { owing: OwingPage; month: ThisMonth }) {
  const dates = useDates();
  const { totals } = owing;
  const days = `${dates.date(startOfMonth())} to ${dates.date(todayIso())}`;
  const fromStudents = month.payments.total;
  const fromCommission = month.commissionReceived.total;
  const moneyIn = fromStudents + fromCommission;
  const profit = moneyIn - month.expenses.total;
  return (
    <TileGrid>
      <FigureTile
        label={profit >= 0 ? FEE_TEXT.profitThisMonth : FEE_TEXT.lossThisMonth}
        value={formatNpr(Math.abs(profit))}
        footnote={FEE_TEXT.moneyInMinusOut}
        tone={profit >= 0 ? "good" : "bad"}
      />
      <FigureTile
        label={FEE_TEXT.moneyIn}
        value={formatNpr(moneyIn)}
        footnote={FEE_TEXT.moneyInSplit(formatNpr(fromStudents), formatNpr(fromCommission))}
      />
      <FigureTile
        label={EXPENSE_TEXT.moneyOut}
        value={formatNpr(month.expenses.total)}
        footnote={EXPENSE_TEXT.moneyOutFootnote(month.expenses.count, days)}
      />
      <FigureTile
        label={FEE_TEXT.feesToCollect}
        value={formatNpr(totals.stillToCollect)}
        footnote={FEE_TEXT.oweMoney(totals.owing)}
        {...(totals.stillToCollect > 0 && { tone: "warn" as const })}
      />
      <FigureTile
        label={COMMISSION_TEXT.toCome}
        value={formatNpr(month.commission.totals.toCome)}
        footnote={COMMISSION_TEXT.fromUniversities}
      />
    </TileGrid>
  );
}

/** The Students who owe most, each with a paid-so-far bar (spec 22a). */
export function WhoStillOwes({ owing }: { owing: Loaded<OwingPage> }) {
  return (
    <Section
      title={FEE_TEXT.whoStillOwes}
      aside={
        <Link href={ROUTES.accounts} className={ACCOUNTS_LINK}>
          {FEE_TEXT.allFees}
        </Link>
      }
    >
      {owing.status === "loading" && <p className="text-ink-2">{MESSAGES.loading}</p>}
      {owing.status === "failed" && <Banner tone="problem">{FEE_TEXT.owingFailed}</Banner>}
      {owing.status === "loaded" && (
        <Panel>
          {owing.data.rows.length === 0 ? (
            <EmptyState>{FEE_TEXT.everyonePaid}</EmptyState>
          ) : (
            <RowList label={FEE_TEXT.whoStillOwes}>
              {owing.data.rows.slice(0, OWING_ON_HOME).map((row) => {
                const percent = paidShare(row.fees, row.paid);
                return (
                  <RowItem
                    key={row.student.id}
                    title={
                      <Link
                        href={ROUTES.student(row.student.id)}
                        className="text-ink hover:text-accent min-h-control inline-flex items-center break-words underline-offset-4 hover:underline"
                      >
                        {row.student.name}
                      </Link>
                    }
                    right={
                      <span className="text-warn font-semibold whitespace-nowrap tabular-nums">
                        {FEE_TEXT.left(formatNpr(row.stillToPay))}
                      </span>
                    }
                  >
                    <ProgressBar label={FEE_TEXT.paidShareOf(row.student.name)} value={percent} />
                    <span className="text-small text-ink-2">
                      {FEE_TEXT.paidOf(formatNpr(row.paid), formatNpr(row.fees), percent)}
                    </span>
                  </RowItem>
                );
              })}
            </RowList>
          )}
        </Panel>
      )}
    </Section>
  );
}
