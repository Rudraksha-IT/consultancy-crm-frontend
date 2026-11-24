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
import { COMMUNICATION_TEXT } from "@/constants/communication";
import { EXPORT_TEXT } from "@/constants/exports";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { PRIORITY_LABELS } from "@/constants/priority";
import { STAGE_LABELS } from "@/constants/stages";
import { PROFILE_TEXT } from "@/constants/studentProfile";
import { COUNTRY_LABELS, SOURCE_LABELS, TARGET_LEVEL_LABELS } from "@/constants/students";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { CounsellorChoice } from "@/lib/api";
import { describeFilters, exportFilters } from "@/lib/exports";
import {
  defaultStudentFilters,
  hasAnyFilter,
  studentListQuery,
  type StudentFilters,
} from "@/lib/students";

import { AddVisitorDialog } from "./AddVisitorDialog";
import { StudentFilterBar } from "./StudentFilterBar";
import { StudentPager } from "./StudentPager";
import { StudentTable } from "./StudentTable";
import { canBeAssignedStudents } from "./counsellorFilter";
import { useCounsellorChoices } from "./useCounsellorChoices";
import { useStudentList, type StudentListState } from "./useStudentList";

const SEARCH_DELAY_MS = 300;

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
      role={staff.role}
      initialSearch={initialSearch}
      initialStage={initialStage}
      initialPriority={initialPriority}
      initialCounsellor={initialCounsellor}
    />
  );
}

type StudentListProps = {
  role: Role;
  initialSearch: string;
  initialStage: string;
  initialPriority: string;
  initialCounsellor: string;
};

function StudentList({
  role,
  initialSearch,
  initialStage,
  initialPriority,
  initialCounsellor,
}: StudentListProps) {
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
        />
        <ListContent
          list={list}
          isFiltered={hasAnyFilter(applied)}
          addButton={addButton}
          onPage={setPage}
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
          }}
        />
      )}
    </>
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
