"use client";

import Link from "next/link";

import { useLoaded } from "@/components/features/home/useLoaded";
import { Banner } from "@/components/ui/Banner";
import { Chip } from "@/components/ui/Chip";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { OneLine } from "@/components/ui/OneLine";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { TileGrid } from "@/components/ui/TileGrid";
import { Loading } from "@/components/ui/Loading";
import { FEES_BY_TYPE_TEXT as TEXT } from "@/constants/feesByType";
import { ROUTES } from "@/constants/routes";
import { fetchFeesByType, type FeesByType } from "@/lib/api";
import { formatNpr } from "@/lib/money";

import { AdminAccountsOnly } from "./AdminAccountsOnly";
import { BackLink } from "./BackLink";

export const HEAD = "text-small text-ink-2 bg-fill px-6 py-3 text-left font-semibold";
export const CELL = "px-6 py-4 align-middle";
export const NUMBER = "text-right whitespace-nowrap tabular-nums";
const FOOT = "border-rule border-t px-6 py-4 font-semibold max-phone:hidden";

/**
 * Fees by type (spec 79-81, 84, 93): To collect, Received and Remaining for all time, then one row
 * per Fee Type with its Fees added and Received. Admins only, with the Accounts Module.
 */
export function FeesByTypePage() {
  return (
    <AdminAccountsOnly>
      <FeesByTypeBody />
    </AdminAccountsOnly>
  );
}

function load(): Promise<FeesByType> {
  return fetchFeesByType();
}

function FeesByTypeBody() {
  const state = useLoaded(load, 0);
  return (
    <div className="grid gap-8">
      <PageHeader
        title={TEXT.title}
        subtitle={TEXT.intro}
        crumbs={<BackLink href={ROUTES.home}>{TEXT.home}</BackLink>}
      />
      {state.status === "loading" && <Loading />}
      {state.status === "failed" && <Banner tone="problem">{TEXT.failed}</Banner>}
      {state.status === "loaded" && <Figures found={state.data} />}
    </div>
  );
}

function Figures({ found }: { found: FeesByType }) {
  const { totals } = found;
  return (
    <>
      <TileGrid>
        <FigureTile
          label={TEXT.toCollect}
          value={formatNpr(totals.toCollect)}
          footnote={TEXT.receivedPlusRemaining}
        />
        <FigureTile
          label={TEXT.received}
          value={formatNpr(totals.received)}
          footnote={TEXT.everyPayment}
          tone="good"
        />
        <FigureTile
          label={TEXT.remaining}
          value={formatNpr(totals.remaining)}
          footnote={TEXT.haveFeesLeft(totals.owing)}
          {...(totals.remaining > 0 && { tone: "warn" as const })}
        />
      </TileGrid>
      <Section title={TEXT.byFeeType}>
        <Panel>
          <ByFeeType found={found} />
        </Panel>
      </Section>
      <p className="text-small text-ink-2 max-w-prose">
        {TEXT.oneBalance}{" "}
        {TEXT.lostLeftOut(totals.lostNotCounted > 0 ? formatNpr(totals.lostNotCounted) : null)}
      </p>
    </>
  );
}

/** One row per Fee Type; on a phone the name and Received, with Fees added under the name. */
function ByFeeType({ found }: { found: FeesByType }) {
  if (found.feeTypes.length === 0) return <EmptyState>{TEXT.nothingYet}</EmptyState>;
  const feesAdded = found.feeTypes.reduce((sum, row) => sum + row.fees, 0);
  return (
    <DataTable phone="list" label={TEXT.byFeeType}>
      <thead>
        <tr>
          <th scope="col" className={HEAD}>
            {TEXT.feeType}
          </th>
          <th scope="col" className={`${HEAD} text-right`}>
            {TEXT.feesAdded}
          </th>
          <th scope="col" className={`${HEAD} text-right`}>
            {TEXT.received}
          </th>
        </tr>
      </thead>
      <tbody className="divide-rule divide-y">
        {found.feeTypes.map((row) => (
          <DataRow key={row.feeType.id} opensPage className="hover:bg-fill max-phone:p-5">
            <DataCell part="title" shrinks className={CELL}>
              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  href={ROUTES.feeTypeStudents(row.feeType.id)}
                  className="text-ink hover:text-accent min-h-control inline-flex max-w-full items-center font-semibold underline-offset-4 hover:underline"
                >
                  <OneLine>{row.feeType.name}</OneLine>
                </Link>
                {row.feeType.hidden && <Chip hasDot={false}>{TEXT.hidden}</Chip>}
              </span>
            </DataCell>
            <DataCell
              part="line"
              className={`${CELL} phone:text-right whitespace-nowrap tabular-nums`}
            >
              <span className="phone:sr-only">{TEXT.feesAdded} </span>
              {formatNpr(row.fees)}
            </DataCell>
            <DataCell part="fact" className={`${CELL} ${NUMBER} font-semibold`}>
              {formatNpr(row.received)}
            </DataCell>
          </DataRow>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className={`${FOOT} text-left`}>
            {TEXT.total}
          </th>
          <td className={`${FOOT} ${NUMBER}`}>{formatNpr(feesAdded)}</td>
          <td className={`${FOOT} ${NUMBER}`}>{formatNpr(found.totals.received)}</td>
        </tr>
      </tfoot>
    </DataTable>
  );
}
