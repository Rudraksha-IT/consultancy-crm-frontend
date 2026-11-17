"use client";

import Link from "next/link";
import { useState } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/useToast";
import { BIN_TEXT, DOCUMENT_TEXT } from "@/constants/documents";
import { ROUTES } from "@/constants/routes";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import {
  deleteForGood,
  fetchBinFileLink,
  restoreFromBin,
  type BinItem,
  type BinPage,
  type BinTarget,
} from "@/lib/api";
import { openBlankTab } from "@/lib/documents";

import { OpenFileButton } from "./OpenFileButton";
import { binFailure } from "./useBinActions";
import type { BinState } from "./useBin";

type BinTabProps = {
  state: BinState;
  onPage: (page: number) => void;
  /** Something was restored or deleted for good: load the Bin again. */
  onChanged: () => void;
};

/**
 * The Bin tab (issue 79): what Staff asked to delete, newest first. An Admin opens the files to
 * check, then restores or deletes for good. Nothing empties it by itself.
 */
export function BinTab({ state, onPage, onChanged }: BinTabProps) {
  const [deleting, setDeleting] = useState<BinItem | null>(null);
  const actions = useBinTabActions(onChanged);
  return (
    <div className="grid gap-4">
      <p className="text-ink-2 max-w-prose">{BIN_TEXT.binIntro}</p>
      {actions.problem !== null && <Banner tone="problem">{actions.problem}</Banner>}
      <BinContent
        state={state}
        onPage={onPage}
        onOpen={(fileId) => {
          void actions.open(fileId);
        }}
        onRestore={(item) => {
          void actions.restore(item);
        }}
        onDelete={setDeleting}
      />
      {deleting !== null && (
        <ConfirmDialog
          title={BIN_TEXT.deleteForGoodTitle(itemName(deleting))}
          actionLabel={BIN_TEXT.deleteForGood}
          onClose={() => {
            setDeleting(null);
          }}
          onConfirm={async () => {
            await actions.deleteForGood(deleting);
            setDeleting(null);
          }}
          failureOf={binFailure}
        >
          {BIN_TEXT.deleteForGoodBody}
        </ConfirmDialog>
      )}
    </div>
  );
}

/** A whole Document is named by its type, one file by its own name. */
function itemName(item: BinItem): string {
  const file = binnedFile(item);
  return file === null ? item.document.name : file.fileName;
}

/** The one file an item is about, or null for a whole Document. */
function binnedFile(item: BinItem): BinItem["files"][number] | null {
  return item.kind === "file" ? (item.files[0] ?? null) : null;
}

function targetOf(item: BinItem): BinTarget {
  return { documentId: item.document.id, fileId: binnedFile(item)?.id ?? null };
}

function useBinTabActions(onChanged: () => void) {
  const { showToast } = useToast();
  const navigate = useFullPageNavigation();
  const [problem, setProblem] = useState<string | null>(null);
  return {
    problem,
    open: async (fileId: number) => {
      setProblem(null);
      const tab = openBlankTab();
      try {
        const url = await fetchBinFileLink(fileId, "open");
        if (tab === null) {
          navigate(url);
          return;
        }
        tab.opener = null;
        tab.location.replace(url);
      } catch {
        tab?.close();
        setProblem(DOCUMENT_TEXT.linkFailed);
      }
    },
    restore: async (item: BinItem) => {
      setProblem(null);
      try {
        await restoreFromBin(item.student.id, targetOf(item));
        showToast(BIN_TEXT.restored(itemName(item)));
        onChanged();
      } catch (error) {
        setProblem(binFailure(error));
      }
    },
    deleteForGood: async (item: BinItem) => {
      await deleteForGood(item.student.id, targetOf(item));
      showToast(BIN_TEXT.deletedForGood(itemName(item)));
      onChanged();
    },
  };
}

type BinContentProps = {
  state: BinState;
  onPage: (page: number) => void;
  onOpen: (fileId: number) => void;
  onRestore: (item: BinItem) => void;
  onDelete: (item: BinItem) => void;
};

function BinContent({ state, onPage, ...actions }: BinContentProps) {
  if (state.status === "loading") return <p className="text-ink-2">{BIN_TEXT.binLoading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{BIN_TEXT.binFailed}</Banner>;
  const { page } = state;
  return (
    <Panel>
      {page.items.length === 0 ? (
        <EmptyState>{BIN_TEXT.binEmpty}</EmptyState>
      ) : (
        <ul aria-label={BIN_TEXT.tabBin} className="divide-rule divide-y">
          {page.items.map((item) => (
            <BinRow
              key={`${item.kind}-${String(targetOf(item).fileId ?? item.document.id)}`}
              item={item}
              {...actions}
            />
          ))}
        </ul>
      )}
      <BinPager page={page} onPage={onPage} />
    </Panel>
  );
}

type BinRowProps = Omit<BinContentProps, "state" | "onPage"> & { item: BinItem };

/** One item: what, whose, who and when, why, its files to open, and Restore or Delete for good. */
function BinRow({ item, onOpen, onRestore, onDelete }: BinRowProps) {
  const dates = useDates();
  const name = itemName(item);
  return (
    <li className="tablet:grid-cols-[minmax(0,1fr)_auto] grid items-start gap-x-6 gap-y-4 px-6 py-5">
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-body text-ink font-semibold break-all">{name}</span>
          {item.kind === "file" && (
            <span className="text-small text-ink-3">{BIN_TEXT.oneFileOf(item.document.name)}</span>
          )}
        </div>
        <div className="text-secondary text-ink-2 flex flex-wrap items-center gap-x-2">
          <Link
            href={ROUTES.student(item.student.id)}
            className="text-accent min-h-control inline-flex items-center underline-offset-4 hover:underline"
          >
            {item.student.name}
          </Link>
          <span aria-hidden="true">·</span>
          <span>{BIN_TEXT.itemLine(item.bin.by.name, dates.dateTime(item.bin.at))}</span>
        </div>
        <p className="text-ink break-words">
          <span className="font-semibold">{BIN_TEXT.why}</span> {item.bin.reason}
        </p>
        <ul aria-label={DOCUMENT_TEXT.filesOf(name)} className="text-secondary grid">
          {item.files.map((file) => (
            <li key={file.id}>
              <OpenFileButton
                fileName={file.fileName}
                onOpen={() => {
                  onOpen(file.id);
                }}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          icon="restore"
          onClick={() => {
            onRestore(item);
          }}
        >
          <span aria-hidden="true">{BIN_TEXT.restore}</span>
          <span className="sr-only">{BIN_TEXT.restoreFor(name)}</span>
        </Button>
        <Button
          variant="danger"
          icon="trash"
          onClick={() => {
            onDelete(item);
          }}
        >
          <span aria-hidden="true">{BIN_TEXT.deleteForGood}</span>
          <span className="sr-only">{BIN_TEXT.deleteForGoodFor(name)}</span>
        </Button>
      </div>
    </li>
  );
}

function BinPager({ page, onPage }: { page: BinPage; onPage: (page: number) => void }) {
  return (
    <Pager
      summary={BIN_TEXT.itemsCount(page.count)}
      count={page.count}
      page={page.page}
      pageSize={page.pageSize}
      onPage={onPage}
    />
  );
}
