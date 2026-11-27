"use client";

import { type RecordId, parseRecordId } from "@/lib/recordId";
import { useCallback, useId, useState, type SubmitEvent } from "react";

import { ExportButton } from "@/components/features/exports/ExportButton";
import {
  useFeeTypeChoices,
  type FeeTypeChoices,
} from "@/components/features/feeTypes/FeeTypeFields";
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
import { SelectField } from "@/components/ui/SelectField";
import { Loading } from "@/components/ui/Loading";
import { COMMISSION_TEXT } from "@/constants/commission";
import { EXPORT_TEXT } from "@/constants/exports";
import { FEE_TYPE_TEXT } from "@/constants/feeTypes";
import { ACCOUNTS_TEXT, PAYMENT_TEXT } from "@/constants/payments";
import {
  fetchReceivedCommission,
  paymentFilterQuery,
  type PaymentFilters,
  type ReceivedCommission,
} from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { describeFilters } from "@/lib/exports";
import { formatNpr } from "@/lib/money";

/** The first day of this month, "YYYY-MM-01": Money in starts on this month. */
function startOfMonth(): string {
  return `${todayIso().slice(0, "YYYY-MM".length)}-01`;
}

/**
 * Money in: every Payment from Students between two dates, by Student name or phone and
 * Fee Type, with what they add up to (spec 74), plus Commission Received on those days (76e).
 * The list can be exported as a CSV file (issue 06).
 */
export function MoneyIn() {
  const [filters, setFilters] = useState<PaymentFilters>(() => ({
    from: startOfMonth(),
    to: todayIso(),
    search: "",
    feeTypeId: null,
    studentId: null,
  }));
  const choices = useFeeTypeChoices();
  const [page, setPage] = useState(1);
  // Bumped after an edit or delete, so the list and its total load again.
  const [version, setVersion] = useState(0);
  const state = usePaymentPage(filters, page, version);

  return (
    <section aria-label={ACCOUNTS_TEXT.moneyIn} className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-section-title">{ACCOUNTS_TEXT.moneyIn}</h2>
        <ExportButton
          list="payments"
          count={state.status === "loaded" ? state.page.count : null}
          filters={paymentFilterQuery(filters)}
          filtersText={useFiltersText(filters, choices)}
        />
      </div>
      <Tiles state={state} filters={filters} />
      <Panel>
        <FilterForm
          filters={filters}
          choices={choices}
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
    <div className="grid gap-4">
      <TileGrid>
        <FigureTile
          label={ACCOUNTS_TEXT.fromStudents}
          value={formatNpr(page.total)}
          footnote={`${PAYMENT_TEXT.paymentsCount(page.count)}, ${days}`}
        />
        <CommissionTiles commission={commission} fromStudents={page.total} days={days} />
      </TileGrid>
      {/* Under the figures, never one of them: a banner in a figure's place touches the sheet. */}
      {commission.status === "failed" && (
        <Banner tone="problem">{COMMISSION_TEXT.listFailed}</Banner>
      )}
    </div>
  );
}

type CommissionTilesProps = {
  commission: Loaded<ReceivedCommission>;
  fromStudents: number;
  days: string;
};

/** Commission Received on the same days, and everything that came in. */
function CommissionTiles({ commission, fromStudents, days }: CommissionTilesProps) {
  if (commission.status !== "loaded") return null;
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

/** The Payments list's filters in words, for the export dialog. */
function useFiltersText(filters: PaymentFilters, choices: FeeTypeChoices): string {
  const dates = useDates();
  const day = (iso: string): string => (iso === "" ? "" : dates.date(iso));
  return describeFilters(
    [
      [ACCOUNTS_TEXT.from, day(filters.from)],
      [ACCOUNTS_TEXT.to, day(filters.to)],
      [ACCOUNTS_TEXT.feeType, feeTypeName(choices, filters.feeTypeId)],
      [ACCOUNTS_TEXT.search, filters.search],
    ],
    EXPORT_TEXT.noFilters,
  );
}

function feeTypeName(choices: FeeTypeChoices, id: RecordId | null): string {
  const types = Array.isArray(choices) ? choices : [];
  return types.find((type) => type.id === id)?.name ?? "";
}

type FilterFormProps = {
  filters: PaymentFilters;
  choices: FeeTypeChoices;
  fieldErrors: Partial<Record<string, string[]>>;
  onShow: (filters: PaymentFilters) => void;
};

/** From and to dates, a search and the Fee Type; "Show" applies them. */
function FilterForm({ filters, choices, fieldErrors, onShow }: FilterFormProps) {
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
      feeTypeId: chosenId(readField(form, "feeTypeId")),
      studentId: null,
    });
  }

  return (
    <form
      id={formId}
      noValidate
      aria-label={ACCOUNTS_TEXT.filters}
      onSubmit={handleSubmit}
      className="border-rule tablet:grid-cols-2 wide:grid-cols-3 px-gutter grid items-end gap-4 border-b py-5"
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
      <SelectField
        label={ACCOUNTS_TEXT.feeType}
        name="feeTypeId"
        options={[
          { value: "", label: FEE_TYPE_TEXT.anyFeeType },
          ...(Array.isArray(choices) ? choices : []).map((type) => ({
            value: type.id,
            label: type.name,
          })),
        ]}
        isOptional
        defaultValue={filters.feeTypeId ?? ""}
        errors={fieldErrors.feeTypeId}
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

function chosenId(value: string): RecordId | null {
  return parseRecordId(value);
}

type PaymentsProps = {
  state: PaymentPageState;
  onPage: (page: number) => void;
  onChanged: () => void;
};

function Payments({ state, onPage, onChanged }: PaymentsProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "refused") return null;
  if (state.status === "failed") {
    return (
      <div className="px-gutter py-5">
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
