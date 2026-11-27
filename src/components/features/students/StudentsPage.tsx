"use client";

import { useState, type ReactNode } from "react";

import { counsellorWords } from "@/components/features/exports/counsellorWords";
import { ExportButton } from "@/components/features/exports/ExportButton";
import { EmailFlow } from "@/components/features/communication/EmailFlow";
import { canMessageStudents } from "@/components/features/communication/canMessage";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Loading } from "@/components/ui/Loading";
import { usePhoneWidth } from "@/components/ui/usePhoneWidth";
import { useScreenQuery } from "@/components/ui/useScreenQuery";
import { ViewSwitch } from "@/components/ui/ViewSwitch";
import { COMMUNICATION_TEXT } from "@/constants/communication";
import { EXPORT_TEXT } from "@/constants/exports";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { PRIORITY_LABELS } from "@/constants/priority";
import { STAGE_LABELS } from "@/constants/stages";
import { PROFILE_TEXT } from "@/constants/studentProfile";
import {
  BOARD_TEXT,
  COUNTRY_LABELS,
  SOURCE_LABELS,
  STUDENTS_VIEW_KEY,
  StudentsView,
  TARGET_LEVEL_LABELS,
} from "@/constants/students";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStoredValue } from "@/hooks/useStoredValue";
import type { CounsellorChoice, StaffContext } from "@/lib/api";
import { describeFilters, exportFilters } from "@/lib/exports";
import {
  BOARD_TOO_NARROW_QUERY,
  defaultStudentFilters,
  hasAnyFilter,
  studentListQuery,
  studentsViewFrom,
  type StudentFilters,
} from "@/lib/students";

import { AddVisitorDialog } from "./AddVisitorDialog";
import { StudentBoard } from "./board/StudentBoard";
import { useStudentBoard } from "./board/useStudentBoard";
import { StudentFilterBar } from "./StudentFilterBar";
import { StudentPager } from "./StudentPager";
import { StudentTable } from "./StudentTable";
import { canBeAssignedStudents } from "./counsellorFilter";
import { useCounsellorChoices } from "./useCounsellorChoices";
import { useStudentList, type StudentListState } from "./useStudentList";

const SEARCH_DELAY_MS = 300;

const VIEW_OPTIONS = [
  { value: StudentsView.Board, label: BOARD_TEXT.board, icon: "batches" },
  { value: StudentsView.List, label: BOARD_TEXT.list, icon: "list" },
] as const;

type StudentsPageProps = {
  /** A search typed in the top bar, which looks through every Student. */
  initialSearch: string;
  /** A Stage from the address (checked before use), e.g. from a pipeline card. */
  initialStage?: string;
  /** A Priority from the address (checked before use), e.g. from Home (ticket 11). */
  initialPriority?: string;
  /** A counsellor filter from the address (checked before use), from Home (ticket 12). */
  initialCounsellor?: string;
};

/** Every Student, searchable and filtered, for every Role but Teachers (spec 29-31). */
export function StudentsPage({
  initialSearch,
  initialStage = "",
  initialPriority = "",
  initialCounsellor = "",
}: StudentsPageProps) {
  const { staff } = useCurrentStaff();
  if (staff.role === Role.Teacher) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return (
    <StudentList
      viewer={staff}
      initialSearch={initialSearch}
      initialStage={initialStage}
      initialPriority={initialPriority}
      initialCounsellor={initialCounsellor}
    />
  );
}

type StudentListProps = {
  viewer: StaffContext["staff"];
  initialSearch: string;
  initialStage: string;
  initialPriority: string;
  initialCounsellor: string;
};

function StudentList({
  viewer,
  initialSearch,
  initialStage,
  initialPriority,
  initialCounsellor,
}: StudentListProps) {
  const { role } = viewer;
  const [filters, setFilters] = useState<StudentFilters>(() =>
    defaultStudentFilters(role, {
      search: initialSearch,
      stage: initialStage,
      priority: initialPriority,
      counsellor: initialCounsellor,
    }),
  );
  const [search, setSearch] = useState(filters.search);
  const settledSearch = useDebouncedValue(search, SEARCH_DELAY_MS);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const canMessage = canMessageStudents(useCurrentStaff());
  const counsellors = useCounsellorChoices();
  const applied = { ...filters, search: settledSearch };
  const list = useStudentList(applied, page, version);
  const { view, isBoard, storeView } = useStudentsView();
  const board = useStudentBoard(applied, isBoard);

  function change(next: Partial<StudentFilters>): void {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
    if (next.priority !== undefined) keepPriorityInAddress(next.priority);
  }

  const addButton = (
    <Button
      variant="primary"
      icon="userplus"
      onClick={() => {
        setIsAdding(true);
      }}
    >
      {LABELS.addVisitor}
    </Button>
  );

  const messageButton = canMessage && (
    <Button
      icon="send"
      onClick={() => {
        setIsMessaging(true);
      }}
    >
      {COMMUNICATION_TEXT.emailThisList}
    </Button>
  );

  return (
    <>
      <PageHeader
        title={LABELS.students}
        actions={
          <>
            {messageButton}
            <StudentsExport role={role} list={list} filters={applied} counsellors={counsellors} />
            {addButton}
          </>
        }
      />
      <Panel>
        <StudentFilterBar
          search={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          filters={filters}
          onChange={change}
          counsellors={counsellors}
          canBeAssigned={canBeAssignedStudents(role)}
          resultText={list.status === "loaded" ? LABELS.studentCount(list.page.count) : undefined}
        />
        <StudentsContent
          view={view}
          onView={storeView}
          board={<StudentBoard board={board} viewer={viewer} />}
          list={
            <ListContent
              list={list}
              isFiltered={hasAnyFilter(applied)}
              addButton={addButton}
              onPage={setPage}
            />
          }
        />
      </Panel>
      {isMessaging && (
        <EmailFlow
          mode="many"
          preTick={{ kind: "students", filters: applied }}
          onClose={() => {
            setIsMessaging(false);
          }}
        />
      )}
      {isAdding && (
        <AddVisitorDialog
          onClose={() => {
            setIsAdding(false);
          }}
          onAdded={() => {
            setIsAdding(false);
            setPage(1);
            setVersion((current) => current + 1);
            void board.refresh();
          }}
        />
      )}
    </>
  );
}

/**
 * How Students are shown: the List alone on a phone and wherever the board's five columns don't
 * fit (it would scroll sideways); on a wider screen what this device remembers, the Board first
 * (UI revamp 08; owner, 2026-11-27).
 */
function useStudentsView() {
  const isPhone = usePhoneWidth();
  const isTooNarrow = useScreenQuery(BOARD_TOO_NARROW_QUERY);
  const [stored, storeView] = useStoredValue(STUDENTS_VIEW_KEY);
  /** Null where there is no board: the List, with no switch. */
  const view = isPhone || isTooNarrow ? null : studentsViewFrom(stored);
  return { view, isBoard: view === StudentsView.Board, storeView };
}

type StudentsContentProps = {
  /** The view shown, or null where there is no board: the List, with no switch. */
  view: StudentsView | null;
  onView: (view: StudentsView) => void;
  board: ReactNode;
  list: ReactNode;
};

/** The Board / List switch (only where the board fits) and the view it chooses. */
function StudentsContent({ view, onView, board, list }: StudentsContentProps) {
  if (view === null) return list;
  return (
    <>
      <ViewBar view={view} onChange={onView} />
      {view === StudentsView.Board ? board : list}
    </>
  );
}

type ViewBarProps = {
  view: StudentsView;
  onChange: (view: StudentsView) => void;
};

/**
 * How to move a card (on the Board) on the left, the Board / List switch on the right. The page
 * is the usual width in both views, so the switch stays under the pointer when it is pressed.
 */
function ViewBar({ view, onChange }: ViewBarProps) {
  return (
    <div
      data-swap-bar=""
      className="px-gutter flex flex-wrap items-center justify-between gap-3 py-3"
    >
      {view === StudentsView.Board && (
        <p className="text-small text-ink-2">
          <span data-hint="drag">{BOARD_TEXT.hintDrag}</span>
          <span data-hint="touch">{BOARD_TEXT.hintTouch}</span>
        </p>
      )}
      <span className="ml-auto">
        <ViewSwitch
          label={BOARD_TEXT.showAs}
          options={VIEW_OPTIONS}
          value={view}
          onChange={onChange}
        />
      </span>
    </div>
  );
}

type ListContentProps = {
  list: StudentListState;
  isFiltered: boolean;
  addButton: ReactNode;
  onPage: (page: number) => void;
};

function ListContent({ list, isFiltered, addButton, onPage }: ListContentProps) {
  if (list.status === "loading") return <Loading />;
  if (list.status === "failed") {
    return (
      <div className="p-6">
        <Banner tone="problem">{MESSAGES.studentsFailed}</Banner>
      </div>
    );
  }
  const { count, page, pageSize, students } = list.page;
  if (students.length === 0) {
    return isFiltered ? (
      <EmptyState>{MESSAGES.noStudentsMatch}</EmptyState>
    ) : (
      <EmptyState action={addButton}>{MESSAGES.noStudents}</EmptyState>
    );
  }
  return (
    <>
      <StudentTable students={students} />
      <StudentPager count={count} page={page} pageSize={pageSize} onPage={onPage} />
    </>
  );
}

type StudentsExportProps = {
  role: Role;
  list: StudentListState;
  filters: StudentFilters;
  counsellors: readonly CounsellorChoice[];
};

/** Export, for Admins only (spec 31b): the whole list with the filters on screen. */
function StudentsExport({ role, list, filters, counsellors }: StudentsExportProps) {
  if (role !== Role.Admin) return null;
  return (
    <ExportButton
      list="students"
      count={list.status === "loaded" ? list.page.count : null}
      filters={exportFilters(studentListQuery(filters, 1))}
      filtersText={studentFiltersText(filters, counsellors)}
    />
  );
}

/** The Student list's filters in words, for the export dialog. */
function studentFiltersText(filters: StudentFilters, counsellors: readonly CounsellorChoice[]) {
  return describeFilters(
    [
      [EXPORT_TEXT.search, filters.search],
      [LABELS.stage, wordFor(filters.stage, STAGE_LABELS)],
      [LABELS.priority, wordFor(filters.priority, PRIORITY_LABELS)],
      [LABELS.counsellor, counsellorWords(filters.counsellor, counsellors)],
      [LABELS.howTheyFoundUs, wordFor(filters.source, SOURCE_LABELS)],
      [LABELS.wantsToStudyIn, wordFor(filters.country, COUNTRY_LABELS)],
      [PROFILE_TEXT.targetLevel, wordFor(filters.targetLevel, TARGET_LEVEL_LABELS)],
    ],
    EXPORT_TEXT.noFilters,
  );
}

/** A filter's value in words, or "" when it is "any". */
function wordFor<Value extends string>(value: Value | "", labels: Record<Value, string>): string {
  return value === "" ? "" : labels[value];
}

/**
 * Write the Priority filter into the address (or take it out), so a reload or a shared link
 * keeps it (ticket 11). Replaces the entry without scrolling or reloading the page.
 */
function keepPriorityInAddress(priority: string): void {
  const url = new URL(window.location.href);
  if (priority === "") url.searchParams.delete("priority");
  else url.searchParams.set("priority", priority);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
