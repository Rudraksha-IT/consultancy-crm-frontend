"use client";

import { useEffect, useState } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { EXPORT_LIST_LABELS, EXPORT_TEXT } from "@/constants/exports";
import { fetchExportRecords, type ExportRecordPage } from "@/lib/api";

type RecordsState =
  { status: "loading" } | { status: "failed" } | { status: "loaded"; page: ExportRecordPage };

/**
 * Configuration → Exports: every list downloaded as a CSV file, newest first, with who did it
 * and when (spec 31c). Read-only: Export Records are never changed.
 */
export function ExportsSettings() {
  const [page, setPage] = useState(1);
  const records = useExportRecords(page);
  return (
    <Section title={EXPORT_TEXT.exports}>
      <div className="grid gap-4">
        <p className="text-small text-ink-2">{EXPORT_TEXT.exportsHelp}</p>
        <Panel>
          <Records records={records} onPage={setPage} />
        </Panel>
      </div>
    </Section>
  );
}

function Records({ records, onPage }: { records: RecordsState; onPage: (page: number) => void }) {
  const dates = useDates();
  if (records.status === "loading") return <p className="text-ink-2 p-6">{EXPORT_TEXT.loading}</p>;
  if (records.status === "failed") {
    return (
      <div className="p-6">
        <Banner tone="problem">{EXPORT_TEXT.loadFailed}</Banner>
      </div>
    );
  }
  const { count, page, pageSize, records: shown } = records.page;
  if (shown.length === 0) return <EmptyState>{EXPORT_TEXT.noExports}</EmptyState>;
  return (
    <>
      <RowList label={EXPORT_TEXT.exports}>
        {shown.map((record) => (
          <RowItem
            key={record.id}
            title={EXPORT_TEXT.recordTitle(EXPORT_LIST_LABELS[record.list], record.rowCount)}
            meta={<span className="break-words">{record.filters}</span>}
            right={
              <span className="text-secondary text-ink-2">{`${record.by}, ${dates.dateTime(record.at)}`}</span>
            }
          />
        ))}
      </RowList>
      {count > pageSize && (
        <Pager
          summary={EXPORT_TEXT.count(count)}
          count={count}
          page={page}
          pageSize={pageSize}
          onPage={onPage}
        />
      )}
    </>
  );
}

function useExportRecords(page: number): RecordsState {
  const [state, setState] = useState<RecordsState>({ status: "loading" });
  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const loaded = await fetchExportRecords(page);
        if (!isCancelled) setState({ status: "loaded", page: loaded });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [page]);
  return state;
}
