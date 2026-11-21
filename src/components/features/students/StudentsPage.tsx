"use client";

import type { RecordId } from "@/lib/recordId";
import { useState, type ReactNode } from "react";

import { counsellorWords } from "@/components/features/exports/counsellorWords";
import { ExportButton } from "@/components/features/exports/ExportButton";
import { SelectAllStrip } from "@/components/features/exports/SelectionCells";
import { SelectionBar } from "@/components/features/exports/SelectionBar";
import { useRowSelection, type RowSelection } from "@/components/features/exports/useRowSelection";
import { EmailFlow } from "@/components/features/communication/EmailFlow";
import { canMessageStudents } from "@/components/features/communication/canMessage";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { COMMUNICATION_TEXT } from "@/constants/communication";
import { EXPORT_TEXT } from "@/constants/exports";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
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
};

/** Every Student, searchable and filtered, for every Role but Teachers (spec 29-31). */
export function StudentsPage({ initialSearch, initialStage = "" }: StudentsPageProps) {
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
    <StudentList role={staff.role} initialSearch={initialSearch} initialStage={initialStage} />
  );
}

type StudentListProps = { role: Role; initialSearch: string; initialStage: string };

function StudentList({ role, initialSearch, initialStage }: StudentListProps) {
  const [filters, setFilters] = useState<StudentFilters>(() =>
    defaultStudentFilters(role, initialSearch, initialStage),
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
  const selection = useRowSelection(studentIds(list));

  function change(next: Partial<StudentFilters>): void {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
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
          selection={selection}
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
  selection: RowSelection;
};

function ListContent({ list, isFiltered, addButton, onPage, selection }: ListContentProps) {
  if (list.status === "loading") return <p className="text-ink-2 p-6">{MESSAGES.loading}</p>;
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
      <SelectionBar
        selected={students
          .filter((student) => selection.isSelected(student.id))
          .map((student) => ({
            studentId: student.id,
            email: student.email,
            phone: student.phone,
          }))}
        onClear={selection.clear}
      />
      <SelectAllStrip selection={selection} />
      <StudentTable students={students} selection={selection} />
      <StudentPager count={count} page={page} pageSize={pageSize} onPage={onPage} />
    </>
  );
}

function studentIds(list: StudentListState): RecordId[] {
  return list.status === "loaded" ? list.page.students.map((student) => student.id) : [];
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
      [LABELS.stage, filters.stage === "" ? "" : STAGE_LABELS[filters.stage]],
      [LABELS.counsellor, counsellorWords(filters.counsellor, counsellors)],
      [LABELS.howTheyFoundUs, filters.source === "" ? "" : SOURCE_LABELS[filters.source]],
      [LABELS.wantsToStudyIn, filters.country === "" ? "" : COUNTRY_LABELS[filters.country]],
      [
        PROFILE_TEXT.targetLevel,
        filters.targetLevel === "" ? "" : TARGET_LEVEL_LABELS[filters.targetLevel],
      ],
    ],
    EXPORT_TEXT.noFilters,
  );
}
