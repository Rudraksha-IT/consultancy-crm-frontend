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
import { Chip } from "@/components/ui/Chip";
import {
  deleteCourseFileForGood,
  deleteForGood,
  fetchBinCourseFileLink,
  fetchBinFileLink,
  restoreCourseFile,
  restoreFromBin,
  type BinEntry,
  type BinItem,
  type BinnedCourseFile,
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
  const [deleting, setDeleting] = useState<BinEntry | null>(null);
  const actions = useBinTabActions(onChanged);
  return (
    <div className="grid gap-4">
      <p className="text-ink-2 max-w-prose">{BIN_TEXT.binIntro}</p>
      {actions.problem !== null && <Banner tone="problem">{actions.problem}</Banner>}
      <BinContent
        state={state}
        onPage={onPage}
        onOpen={(link) => {
          void actions.open(link);
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

/** A whole Document is named by its type, one file by its own name, a Course File by its name. */
function itemName(item: BinEntry): string {
  if (item.kind === "course_file") return item.courseFile.name;
  const file = binnedFile(item);
  return file === null ? item.document.name : file.fileName;
}

/** Stays the same for an item while the Bin is shown. */
function keyOf(item: BinEntry): string {
  if (item.kind === "course_file") return `course-file-${String(item.courseFile.id)}`;
  return `${item.kind}-${String(targetOf(item).fileId ?? item.document.id)}`;
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
    open: async (link: () => Promise<string>) => {
      setProblem(null);
      const tab = openBlankTab();
      try {
        const url = await link();
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
    restore: async (item: BinEntry) => {
      setProblem(null);
      try {
        if (item.kind === "course_file") await restoreCourseFile(item.courseFile.id);
        else await restoreFromBin(item.student.id, targetOf(item));
        showToast(BIN_TEXT.restored(itemName(item)));
        onChanged();
      } catch (error) {
        setProblem(binFailure(error));
      }
    },
    deleteForGood: async (item: BinEntry) => {
      if (item.kind === "course_file") await deleteCourseFileForGood(item.courseFile.id);
      else await deleteForGood(item.student.id, targetOf(item));
      showToast(BIN_TEXT.deletedForGood(itemName(item)));
      onChanged();
    },
  };
}

type BinContentProps = {
  state: BinState;
  onPage: (page: number) => void;
  /** Open a file through the link the function fetches. */
  onOpen: (link: () => Promise<string>) => void;
  onRestore: (item: BinEntry) => void;
  onDelete: (item: BinEntry) => void;
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
          {page.items.map((item) =>
            item.kind === "course_file" ? (
              <CourseFileRow key={keyOf(item)} item={item} {...actions} />
            ) : (
              <BinRow key={keyOf(item)} item={item} {...actions} />
            ),
          )}
        </ul>
      )}
      <BinPager page={page} onPage={onPage} />
    </Panel>
  );
}

type RowActions = Omit<BinContentProps, "state" | "onPage">;
type BinRowProps = RowActions & { item: BinItem };

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
          <Chip hasDot={false}>{BIN_TEXT.kindDocument}</Chip>
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
                  onOpen(() => fetchBinFileLink(file.id, "open"));
                }}
              />
            </li>
          ))}
        </ul>
      </div>
      <RowButtons item={item} onRestore={onRestore} onDelete={onDelete} />
    </li>
  );
}

/** A Course File (ticket 10): its name, its University and Course, who and when, why, the PDF. */
function CourseFileRow({
  item,
  onOpen,
  onRestore,
  onDelete,
}: RowActions & { item: BinnedCourseFile }) {
  const dates = useDates();
  const { courseFile } = item;
  return (
    <li className="tablet:grid-cols-[minmax(0,1fr)_auto] grid items-start gap-x-6 gap-y-4 px-6 py-5">
      <div className="grid min-w-0 gap-1">
        <span className="text-body text-ink font-semibold break-words">{courseFile.name}</span>
        <div className="text-secondary text-ink-2 min-h-control flex flex-wrap items-center gap-x-2">
          <Chip hasDot={false}>{BIN_TEXT.kindCourseFile}</Chip>
          <span className="break-words">
            {BIN_TEXT.courseOf(item.university.name, item.course.name)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{BIN_TEXT.itemLine(item.bin.by.name, dates.dateTime(item.bin.at))}</span>
        </div>
        <p className="text-ink break-words">
          <span className="font-semibold">{BIN_TEXT.why}</span> {item.bin.reason}
        </p>
        <div className="text-secondary">
          <OpenFileButton
            fileName={courseFile.fileName}
            onOpen={() => {
              onOpen(() => fetchBinCourseFileLink(courseFile.id));
            }}
          />
        </div>
      </div>
      <RowButtons item={item} onRestore={onRestore} onDelete={onDelete} />
    </li>
  );
}

type RowButtonsProps = Pick<RowActions, "onRestore" | "onDelete"> & { item: BinEntry };

/** Restore and Delete for good, each named for screen readers by the item. */
function RowButtons({ item, onRestore, onDelete }: RowButtonsProps) {
  const name = itemName(item);
  return (
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
