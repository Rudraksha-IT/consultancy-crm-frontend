"use client";

import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { DetailList } from "@/components/ui/DetailList";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/useToast";
import { HTTP_STATUS } from "@/constants/api";
import { EXPORT_COLUMNS, EXPORT_TEXT, MAX_EXPORT_ROWS, type ExportList } from "@/constants/exports";
import { ApiRequestError, downloadExport } from "@/lib/api";
import { DetailAnswerSchema } from "@/lib/api/types";
import { todayIso } from "@/lib/dates";
import { exportFileName, type ExportFilters } from "@/lib/exports";

type ExportButtonProps = {
  list: ExportList;
  /** How many rows the filtered list has, on every page; null until it has loaded. */
  count: number | null;
  /** The list's filters as its own query has them (`exportFilters`). */
  filters: ExportFilters;
  /** The same filters in words, for the dialog. */
  filtersText: string;
};

/**
 * "Export" on a list's header (Admins only; the caller decides): a dialog saying what will be
 * downloaded, then the whole filtered list as a CSV file (spec 31b). More than 10,000 rows is
 * refused before asking.
 */
export function ExportButton({ list, count, filters, filtersText }: ExportButtonProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        icon="download"
        isDisabled={count === null}
        onClick={() => {
          if (count !== null && count > MAX_EXPORT_ROWS) showToast(EXPORT_TEXT.tooMany);
          else setIsOpen(true);
        }}
      >
        {EXPORT_TEXT.export}
      </Button>
      {isOpen && count !== null && (
        <ExportDialog
          list={list}
          count={count}
          filters={filters}
          filtersText={filtersText}
          onClose={() => {
            setIsOpen(false);
          }}
          onExported={() => {
            setIsOpen(false);
            showToast(EXPORT_TEXT.exported(count));
          }}
        />
      )}
    </>
  );
}

type ExportDialogProps = Omit<ExportButtonProps, "count"> & {
  count: number;
  onClose: () => void;
  onExported: () => void;
};

function ExportDialog({
  list,
  count,
  filters,
  filtersText,
  onClose,
  onExported,
}: ExportDialogProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(): Promise<void> {
    setIsBusy(true);
    setError(null);
    try {
      const file = await downloadExport(list, filters);
      saveWithBrowser(file, exportFileName(list, todayIso()));
      onExported();
    } catch (failure) {
      setError(exportFailure(failure));
      setIsBusy(false);
    }
  }

  return (
    <Dialog
      isOpen
      title={EXPORT_TEXT.title(list)}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {EXPORT_TEXT.cancel}
          </Button>
          <Button
            variant="primary"
            icon="download"
            isLoading={isBusy}
            loadingLabel={EXPORT_TEXT.preparing}
            onClick={() => {
              void download();
            }}
          >
            {EXPORT_TEXT.download}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <p>
          <b>{EXPORT_TEXT.downloading(count)}</b>
          {EXPORT_TEXT.asCsv}
        </p>
        <DetailList
          isFlush
          items={[
            { label: EXPORT_TEXT.filters, value: filtersText },
            { label: EXPORT_TEXT.columns, value: EXPORT_COLUMNS[list].join(", ") },
          ]}
        />
        <Banner tone="info" icon="shield">
          {EXPORT_TEXT.recorded}
        </Banner>
        {error !== null && <Banner tone="problem">{error}</Banner>}
      </div>
    </Dialog>
  );
}

/** The server's own short reason (e.g. too many rows, or a read-only office), else the usual. */
function exportFailure(error: unknown): string {
  if (
    error instanceof ApiRequestError &&
    (error.status === HTTP_STATUS.badRequest || error.status === HTTP_STATUS.forbidden)
  ) {
    const refused = DetailAnswerSchema.safeParse(error.body);
    if (refused.success) return refused.data.detail;
  }
  return EXPORT_TEXT.failed;
}

function saveWithBrowser(file: Blob, name: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
