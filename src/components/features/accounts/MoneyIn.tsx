"use client";

import { useCallback, useId, useState, type SubmitEvent } from "react";

import { useLoaded, type Loaded } from "@/components/features/home/useLoaded";
import { DateField } from "@/components/ui/DateField";
import { useDates, type Dates } from "@/components/features/shell/dateDisplay";
import { PaymentTable } from "@/components/features/payments/PaymentTable";
import {
  usePaymentPage,
  type PaymentPageState,
} from "@/components/features/payments/usePaymentPage";
import { readField } from "@/components/features/students/profile/formData";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { SearchBox } from "@/components/ui/SearchBox";
import { TextField } from "@/components/ui/TextField";
import { COMMISSION_TEXT } from "@/constants/commission";
import { MESSAGES } from "@/constants/messages";
import { ACCOUNTS_TEXT, PAYMENT_PURPOSE_SUGGESTIONS, PAYMENT_TEXT } from "@/constants/payments";
import { fetchReceivedCommission, type PaymentFilters, type ReceivedCommission } from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { formatNpr } from "@/lib/money";

/** The first day of this month, "YYYY-MM-01": Money in starts on this month. */
function startOfMonth(): string {
  return `${todayIso().slice(0, "YYYY-MM".length)}-01`;
}

/**
 * Money in: every Payment from Students between two dates, by Student or receipt number and
 * purpose, with what they add up to (spec 74), plus Commission Received on those days (76e).
 */
export function MoneyIn() {
  const [filters, setFilters] = useState<PaymentFilters>(() => ({
    from: startOfMonth(),
    to: todayIso(),
    search: "",
    purpose: "",
    studentId: null,
  }));
  const [page, setPage] = useState(1);
  // Bumped after an edit or delete, so the list and its total load again.
  const [version, setVersion] = useState(0);
  const state = usePaymentPage(filters, page, version);

  return (
    <section aria-label={ACCOUNTS_TEXT.moneyIn} className="grid gap-8">
      <h2 className="text-section-title">{ACCOUNTS_TEXT.moneyIn}</h2>
      <Tiles state={state} filters={filters} />
      <Panel>
        <FilterForm
          filters={filters}
          fieldErrors={state.status === "refused" ? state.fieldErrors : {}}
          onShow={(shown) => {
            setFilters(shown);
            setPage(1);
          }}
        />
        <Payments
          state={state}
          onPage={setPage}
          onChanged={() => {
            setVersion((current) => current + 1);
          }}
        />
      </Panel>
    </section>
  );
}

function Tiles({ state, filters }: { state: PaymentPageState; filters: PaymentFilters }) {
  const dates = useDates();
  const { from, to } = filters;
  const loadCommission = useCallback(() => fetchReceivedCommission({ from, to }), [from, to]);
  const commission = useLoaded(loadCommission, 0);
  if (state.status !== "loaded") return null;
  const { page } = state;
  const days = period(filters, dates);
  return (
    <TileGrid>
      <FigureTile
        label={ACCOUNTS_TEXT.fromStudents}
        value={formatNpr(page.total)}
        footnote={`${PAYMENT_TEXT.paymentsCount(page.count)}, ${days}`}
      />
      <CommissionTiles commission={commission} fromStudents={page.total} days={days} />
    </TileGrid>
  );
}

type CommissionTilesProps = {
  commission: Loaded<ReceivedCommission>;
  fromStudents: number;
  days: string;
};

/** Commission Received on the same days, and everything that came in. */
function CommissionTiles({ commission, fromStudents, days }: CommissionTilesProps) {
  if (commission.status === "loading") return null;
  if (commission.status === "failed") {
    return <Banner tone="problem">{COMMISSION_TEXT.listFailed}</Banner>;
  }
  const received = commission.data;
  return (
    <>
      <FigureTile
        label={COMMISSION_TEXT.fromCommission}
        value={formatNpr(received.total)}
        footnote={COMMISSION_TEXT.commissionCount(received.count)}
      />
      <FigureTile
        label={COMMISSION_TEXT.totalMoneyIn}
        value={formatNpr(fromStudents + received.total)}
        footnote={days}
        tone="good"
      />
    </>
  );
}

/** The dates the list covers in the office's calendar, e.g. "1 Nov 2026 to 2 Nov 2026". */
function period({ from, to }: PaymentFilters, dates: Dates): string {
  if (from !== "" && to !== "") return ACCOUNTS_TEXT.between(dates.date(from), dates.date(to));
  if (from !== "") return ACCOUNTS_TEXT.since(dates.date(from));
  if (to !== "") return ACCOUNTS_TEXT.until(dates.date(to));
  return ACCOUNTS_TEXT.allDates;
}

type FilterFormProps = {
  filters: PaymentFilters;
  fieldErrors: Partial<Record<string, string[]>>;
  onShow: (filters: PaymentFilters) => void;
};

/** From and to dates, a search and the purpose; "Show" applies them. */
function FilterForm({ filters, fieldErrors, onShow }: FilterFormProps) {
  const dates = useDates();
  const formId = useId();
  const [search, setSearch] = useState(filters.search);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onShow({
      from: readField(form, "from"),
      to: readField(form, "to"),
      search,
      purpose: readField(form, "purpose"),
      studentId: null,
    });
  }

  return (
    <form
      id={formId}
      noValidate
      aria-label={ACCOUNTS_TEXT.filters}
      onSubmit={handleSubmit}
      className="border-rule tablet:grid-cols-2 wide:grid-cols-3 grid items-end gap-4 border-b px-6 py-5"
    >
      <DateField
        label={ACCOUNTS_TEXT.from}
        name="from"
        display={dates.display}
        isOptional
        defaultValue={filters.from}
        errors={fieldErrors.from}
      />
      <DateField
        label={ACCOUNTS_TEXT.to}
        name="to"
        display={dates.display}
        isOptional
        defaultValue={filters.to}
        errors={fieldErrors.to}
      />
      <TextField
        label={ACCOUNTS_TEXT.purpose}
        name="purpose"
        isOptional
        suggestions={PAYMENT_PURPOSE_SUGGESTIONS}
        defaultValue={filters.purpose}
        errors={fieldErrors.purpose}
      />
      <div className="tablet:col-span-2 wide:col-span-3 flex flex-wrap items-center gap-3">
        <SearchBox
          label={ACCOUNTS_TEXT.search}
          placeholder={ACCOUNTS_TEXT.search}
          value={search}
          onChange={setSearch}
        />
        <Button type="submit" icon="search">
          {ACCOUNTS_TEXT.show}
        </Button>
      </div>
    </form>
  );
}

type PaymentsProps = {
  state: PaymentPageState;
  onPage: (page: number) => void;
  onChanged: () => void;
};

function Payments({ state, onPage, onChanged }: PaymentsProps) {
  if (state.status === "loading") return <p className="text-ink-2 px-6 py-5">{MESSAGES.loading}</p>;
  if (state.status === "refused") return null;
  if (state.status === "failed") {
    return (
      <div className="px-6 py-5">
        <Banner tone="problem">{PAYMENT_TEXT.listFailed}</Banner>
      </div>
    );
  }
  const { page } = state;
  return (
    <>
      {page.rows.length === 0 ? (
        <EmptyState>{PAYMENT_TEXT.noPaymentsMatch}</EmptyState>
      ) : (
        <PaymentTable payments={page.rows} showsStudent onChanged={onChanged} />
      )}
      <Pager
        summary={PAYMENT_TEXT.paymentsCount(page.count)}
        count={page.count}
        page={page.page}
        pageSize={page.pageSize}
        onPage={onPage}
      />
    </>
  );
}
