"use client";

import Link from "next/link";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Section } from "@/components/ui/Section";
import { Loading } from "@/components/ui/Loading";
import { COMMISSION_TEXT } from "@/constants/commission";
import { EXPENSE_TEXT } from "@/constants/expenses";
import { FEE_TEXT, OWING_ON_HOME } from "@/constants/fees";
import { FEES_BY_TYPE_TEXT } from "@/constants/feesByType";
import { ROUTES } from "@/constants/routes";
import {
  fetchCommission,
  fetchCountedOwingStudents,
  fetchExpenses,
  fetchPayments,
  fetchReceivedCommission,
  type CommissionPage,
  type ExpensePage,
  type OwingPage,
  type PaymentPage,
  type ReceivedCommission,
} from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { paidShare } from "@/lib/money";

import { Amounts, AmountsEye } from "./Amounts";
import { SeeAllLink } from "./SeeAllLink";
import type { HomeAmounts } from "./useHomeAmounts";
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
    fetchPayments({ ...days, search: "", feeTypeId: null, studentId: null }, 1),
    fetchReceivedCommission(days),
    fetchExpenses(null, 1),
    fetchCommission(1),
  ]);
  return { payments, commissionReceived, expenses, commission };
}

/** Who still owes, Lost Students left out: the same rules as Fees by type (spec 87, 91). */
export function loadOwing(): Promise<OwingPage> {
  return fetchCountedOwingStudents(1);
}

const ACCOUNTS_LINK = "min-h-control inline-flex items-center";

/**
 * This month at a glance on the Admin's Home (spec 22a), with the Accounts Module: profit (money
 * in minus money out), money in from Students and Received Commission, money out (Expenses), the
 * Fees still to collect, and the Commission still to come from universities.
 */
export function MonthAtAGlance({
  owing,
  amounts,
}: {
  owing: Loaded<OwingPage>;
  amounts: HomeAmounts;
}) {
  const month = useLoaded(loadThisMonth, 0);
  return (
    <Section
      title={FEE_TEXT.atAGlance}
      titleAside={<AmountsEye amounts={amounts} />}
      aside={
        <Link href={ROUTES.accounts} className={ACCOUNTS_LINK}>
          {FEE_TEXT.openAccounts}
        </Link>
      }
    >
      <GlanceBody owing={owing} month={month} isShown={amounts.isShown} />
    </Section>
  );
}

type GlanceBodyProps = { owing: Loaded<OwingPage>; month: Loaded<ThisMonth>; isShown: boolean };

function GlanceBody({ owing, month, isShown }: GlanceBodyProps) {
  if (owing.status === "loaded" && month.status === "loaded") {
    return <GlanceFigures owing={owing.data} month={month.data} isShown={isShown} />;
  }
  const hasFailed = owing.status === "failed" || month.status === "failed";
  if (hasFailed) return <Banner tone="problem">{FEE_TEXT.glanceFailed}</Banner>;
  return <Loading />;
}

type GlanceFiguresProps = { owing: OwingPage; month: ThisMonth; isShown: boolean };

function GlanceFigures({ owing, month, isShown }: GlanceFiguresProps) {
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
        value={<Amounts isShown={isShown}>{(money) => money(Math.abs(profit))}</Amounts>}
        footnote={FEE_TEXT.moneyInMinusOut}
        tone={profit >= 0 ? "good" : "bad"}
      />
      <FigureTile
        label={FEE_TEXT.moneyIn}
        value={<Amounts isShown={isShown}>{(money) => money(moneyIn)}</Amounts>}
        footnote={
          <Amounts isShown={isShown}>
            {(money) => FEE_TEXT.moneyInSplit(money(fromStudents), money(fromCommission))}
          </Amounts>
        }
      />
      <FigureTile
        label={EXPENSE_TEXT.moneyOut}
        value={<Amounts isShown={isShown}>{(money) => money(month.expenses.total)}</Amounts>}
        footnote={EXPENSE_TEXT.moneyOutFootnote(month.expenses.count, days)}
      />
      <FigureTile
        label={FEE_TEXT.feesToCollect}
        value={<Amounts isShown={isShown}>{(money) => money(totals.stillToCollect)}</Amounts>}
        footnote={FEES_BY_TYPE_TEXT.seeByType(totals.owing)}
        href={ROUTES.feesByType}
        {...(totals.stillToCollect > 0 && { tone: "warn" as const })}
      />
      <FigureTile
        label={COMMISSION_TEXT.toCome}
        value={
          <Amounts isShown={isShown}>{(money) => money(month.commission.totals.toCome)}</Amounts>
        }
        footnote={COMMISSION_TEXT.fromUniversities}
      />
    </TileGrid>
  );
}

/**
 * The 3 Students who owe most, each with a paid-so-far bar (spec 22a), across the full width under
 * Home's desk: side by side from 900, one under another below it. "See all (N)" sits beside the
 * title (UI revamp 07).
 */
export function WhoStillOwes({ owing, isShown }: { owing: Loaded<OwingPage>; isShown: boolean }) {
  const hasAny = owing.status === "loaded" && owing.data.rows.length > 0;
  return (
    <Section
      title={FEE_TEXT.whoStillOwes}
      keepsAsideOnLine
      {...(hasAny && { aside: <SeeAllLink href={ROUTES.accounts} count={owing.data.count} /> })}
    >
      <OwingBody owing={owing} isShown={isShown} />
    </Section>
  );
}

type OwingProps = { owing: Loaded<OwingPage>; isShown: boolean };

function OwingBody({ owing, isShown }: OwingProps) {
  if (owing.status === "loading") return <Loading />;
  if (owing.status === "failed") return <Banner tone="problem">{FEE_TEXT.owingFailed}</Banner>;
  if (owing.data.rows.length === 0) {
    return (
      <Panel>
        <EmptyState>{FEE_TEXT.everyonePaid}</EmptyState>
      </Panel>
    );
  }
  return (
    <Panel>
      <OwingRows owing={owing.data} isShown={isShown} />
    </Panel>
  );
}

function OwingRows({ owing, isShown }: { owing: OwingPage; isShown: boolean }) {
  return (
    <ul
      aria-label={FEE_TEXT.whoStillOwes}
      className="divide-rule mid:grid mid:grid-cols-3 mid:divide-x mid:divide-y-0 divide-y *:min-w-0"
    >
      {owing.rows.slice(0, OWING_ON_HOME).map((row) => {
        const percent = paidShare(row.fees, row.paid);
        return (
          <li key={row.student.id} className="px-gutter grid content-start gap-2 py-3.5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <Link
                href={ROUTES.student(row.student.id)}
                className="text-name text-ink hover:text-accent min-h-control inline-flex min-w-0 items-center font-semibold underline-offset-4 hover:underline"
              >
                <span className="truncate">{row.student.name}</span>
              </Link>
              <span className="text-warn flex-none font-semibold whitespace-nowrap tabular-nums">
                <Amounts isShown={isShown}>
                  {(money) => FEE_TEXT.left(money(row.stillToPay))}
                </Amounts>
              </span>
            </div>
            <ProgressBar label={FEE_TEXT.paidShareOf(row.student.name)} value={percent} />
            <span className="text-small text-ink-2">
              <Amounts isShown={isShown}>
                {(money) => FEE_TEXT.paidOf(money(row.paid), money(row.fees), percent)}
              </Amounts>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
