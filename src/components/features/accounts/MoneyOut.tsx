"use client";

import { useCallback, useState } from "react";

import { useLoaded, type Loaded } from "@/components/features/home/useLoaded";
import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { BarList } from "@/components/ui/BarList";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/useToast";
import { Loading } from "@/components/ui/Loading";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_METHOD_LABELS,
  EXPENSE_MONTHS_SHOWN,
  EXPENSE_TEXT,
} from "@/constants/expenses";
import { fetchExpenses, type Expense, type ExpensePage } from "@/lib/api";
import { formatMonth, recentMonths, todayIso } from "@/lib/dates";
import { formatNpr } from "@/lib/money";

import { ExpenseDialog } from "./ExpenseDialog";

const MONTH_LENGTH = "YYYY-MM".length;

/** Adding (null) or changing an Expense; undefined while no dialog is open. */
type Open = Expense | null | undefined;

/**
 * Accounts -> Money out (spec 76c): one month's Expenses, picked from the last two years, with
 * the month's total, what each kind came to, and every Expense. Admins add, change and delete.
 */
export function MoneyOut() {
  const thisMonth = todayIso().slice(0, MONTH_LENGTH);
  const [month, setMonth] = useState(thisMonth);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState<Open>(undefined);
  const { showToast } = useToast();
  const load = useCallback(() => fetchExpenses(month, page), [month, page]);
  const state = useLoaded(load, version);

  function showMonth(chosen: string): void {
    setMonth(chosen);
    setPage(1);
  }

  return (
    <section aria-label={EXPENSE_TEXT.moneyOut} className="grid gap-8">
      <h2 className="text-section-title">{EXPENSE_TEXT.moneyOut}</h2>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="phone:w-72 w-full">
          <SelectField
            label={EXPENSE_TEXT.month}
            name="month"
            options={recentMonths(todayIso(), EXPENSE_MONTHS_SHOWN).map((value) => ({
              value,
              label: formatMonth(value),
            }))}
            value={month}
            onChange={showMonth}
          />
        </div>
        <Button
          variant="primary"
          icon="plus"
          onClick={() => {
            setOpen(null);
          }}
        >
          {EXPENSE_TEXT.addAnExpense}
        </Button>
      </div>
      <MonthBody
        state={state}
        isThisMonth={month === thisMonth}
        onPage={setPage}
        onAdd={() => {
          setOpen(null);
        }}
        onEdit={setOpen}
      />
      {open !== undefined && (
        <ExpenseDialog
          expense={open}
          onClose={() => {
            setOpen(undefined);
          }}
          onSaved={(saved, toast) => {
            setOpen(undefined);
            if (saved !== null) showMonth(saved.spentOn.slice(0, MONTH_LENGTH));
            setVersion((current) => current + 1);
            showToast(toast);
          }}
        />
      )}
    </section>
  );
}

type MonthBodyProps = {
  state: Loaded<ExpensePage>;
  isThisMonth: boolean;
  onPage: (page: number) => void;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
};

function MonthBody({ state, isThisMonth, onPage, onAdd, onEdit }: MonthBodyProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") return <Banner tone="problem">{EXPENSE_TEXT.listFailed}</Banner>;
  const { data } = state;
  const monthName = formatMonth(data.month);
  const copy = isThisMonth
    ? { spent: EXPENSE_TEXT.spentThisMonth, none: EXPENSE_TEXT.noExpenses }
    : { spent: EXPENSE_TEXT.spentIn(monthName), none: EXPENSE_TEXT.noExpensesIn(monthName) };
  return (
    <>
      <TileGrid>
        <FigureTile
          label={copy.spent}
          value={formatNpr(data.total)}
          footnote={EXPENSE_TEXT.expensesCount(data.count)}
          tone="bad"
        />
      </TileGrid>
      {data.count === 0 ? (
        <Panel>
          <EmptyState
            action={
              <Button icon="plus" onClick={onAdd}>
                {EXPENSE_TEXT.addAnExpense}
              </Button>
            }
          >
            {copy.none}
          </EmptyState>
        </Panel>
      ) : (
        <MonthLists data={data} onPage={onPage} onEdit={onEdit} />
      )}
    </>
  );
}

type MonthListsProps = Pick<MonthBodyProps, "onPage" | "onEdit"> & { data: ExpensePage };

/** What each kind came to, beside every Expense of the month. */
function MonthLists({ data, onPage, onEdit }: MonthListsProps) {
  return (
    <div className="wide:grid-cols-2 grid gap-8">
      <Section title={EXPENSE_TEXT.byType}>
        <Panel>
          <BarList
            label={EXPENSE_TEXT.byType}
            rows={data.byCategory.map((row) => ({
              key: row.category,
              label: EXPENSE_CATEGORY_LABELS[row.category],
              value: row.amount,
            }))}
            format={formatNpr}
          />
        </Panel>
      </Section>
      <Section title={EXPENSE_TEXT.everyExpense}>
        <Panel>
          <ExpenseRows rows={data.rows} onEdit={onEdit} />
          <Pager
            summary={EXPENSE_TEXT.expensesCount(data.count)}
            count={data.count}
            page={data.page}
            pageSize={data.pageSize}
            onPage={onPage}
          />
        </Panel>
      </Section>
    </div>
  );
}

function ExpenseRows({ rows, onEdit }: { rows: Expense[]; onEdit: (expense: Expense) => void }) {
  const dates = useDates();
  return (
    <RowList label={EXPENSE_TEXT.everyExpense}>
      {rows.map((expense) => {
        const category = EXPENSE_CATEGORY_LABELS[expense.category];
        return (
          <RowItem
            key={expense.id}
            title={category}
            meta={
              <span className="wrap-anywhere">
                {EXPENSE_TEXT.line(
                  expense.paidTo,
                  dates.date(expense.spentOn),
                  EXPENSE_METHOD_LABELS[expense.method],
                )}
              </span>
            }
            right={
              <div className="flex items-center gap-3">
                <span className="font-bold whitespace-nowrap tabular-nums">
                  {formatNpr(expense.amount)}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    onEdit(expense);
                  }}
                >
                  <span aria-hidden="true">{EXPENSE_TEXT.edit}</span>
                  <span className="sr-only">{EXPENSE_TEXT.editFor(category, expense.paidTo)}</span>
                </Button>
              </div>
            }
          />
        );
      })}
    </RowList>
  );
}
