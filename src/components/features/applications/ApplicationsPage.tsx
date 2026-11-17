"use client";

import { useState } from "react";

import { counsellorWords } from "@/components/features/exports/counsellorWords";
import { ExportButton } from "@/components/features/exports/ExportButton";
import { SelectAllStrip } from "@/components/features/exports/SelectionCells";
import { SelectionBar } from "@/components/features/exports/SelectionBar";
import { useRowSelection, type RowSelection } from "@/components/features/exports/useRowSelection";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { canBeAssignedStudents } from "@/components/features/students/counsellorFilter";
import { useCounsellorChoices } from "@/components/features/students/useCounsellorChoices";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { APPLICATION_LIST_TEXT as TEXT, APPLICATION_STATUS_LABELS } from "@/constants/applications";
import { EXPORT_TEXT } from "@/constants/exports";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { COUNTRY_LABELS } from "@/constants/students";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { CounsellorChoice } from "@/lib/api";
import {
  applicationListQuery,
  defaultApplicationFilters,
  hasAnyApplicationFilter,
  type ApplicationFilters,
} from "@/lib/applications";
import { formatIntake } from "@/lib/dates";
import { describeFilters, exportFilters } from "@/lib/exports";

import { ApplicationFilterBar } from "./ApplicationFilterBar";
import { ApplicationTable } from "./ApplicationTable";
import { useApplicationFilterChoices } from "./useApplicationFilterChoices";
import { useApplicationList, type ApplicationListState } from "./useApplicationList";

const SEARCH_DELAY_MS = 300;

/** Every Application in the office, for every Role but Teachers (spec 57a). */
export function ApplicationsPage() {
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
  return <ApplicationList role={staff.role} />;
}

function ApplicationList({ role }: { role: Role }) {
  const [filters, setFilters] = useState<ApplicationFilters>(() => defaultApplicationFilters(role));
  const [search, setSearch] = useState("");
  const settledSearch = useDebouncedValue(search, SEARCH_DELAY_MS);
  const [page, setPage] = useState(1);
  const choices = useApplicationFilterChoices();
  const counsellors = useCounsellorChoices();
  const applied = { ...filters, search: settledSearch };
  const list = useApplicationList(applied, page);
  const selection = useRowSelection(applicationIds(list));

  return (
    <>
      <PageHeader
        title={TEXT.title}
        subtitle={TEXT.subtitle}
        actions={
          <ApplicationsExport role={role} list={list} filters={applied} counsellors={counsellors} />
        }
      />
      <Panel>
        <ApplicationFilterBar
          search={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          filters={filters}
          onChange={(change) => {
            setFilters((current) => ({ ...current, ...change }));
            setPage(1);
          }}
          choices={choices}
          counsellors={counsellors}
          canBeAssigned={canBeAssignedStudents(role)}
        />
        <ListContent
          list={list}
          isFiltered={hasAnyApplicationFilter(applied)}
          onPage={setPage}
          selection={selection}
        />
      </Panel>
    </>
  );
}

type ListContentProps = {
  list: ApplicationListState;
  isFiltered: boolean;
  onPage: (page: number) => void;
  selection: RowSelection;
};

function ListContent({ list, isFiltered, onPage, selection }: ListContentProps) {
  if (list.status === "loading") return <p className="text-ink-2 p-6">{TEXT.loading}</p>;
  if (list.status === "failed") {
    return (
      <div className="p-6">
        <Banner tone="problem">{TEXT.failed}</Banner>
      </div>
    );
  }
  const { count, page, pageSize, applications } = list.page;
  if (applications.length === 0) {
    return <EmptyState>{isFiltered ? TEXT.noneMatch : TEXT.none}</EmptyState>;
  }
  return (
    <>
      <SelectionBar
        selected={applications
          .filter((application) => selection.isSelected(application.id))
          .map(({ student }) => ({
            studentId: student.id,
            email: student.email,
            phone: student.phone,
          }))}
        onClear={selection.clear}
      />
      <SelectAllStrip selection={selection} />
      {/* All seven columns fit: long names and courses are cut with … and dates may wrap
          (ui/DataTable `shrinks`, `wraps`). The box only scrolls as a last resort, never the page. `relative` keeps the hidden column labels
          inside it too. */}
      <div
        role="region"
        aria-label={TEXT.title}
        tabIndex={0}
        className="relative min-w-0 overflow-x-auto focus-visible:-outline-offset-4"
      >
        <ApplicationTable applications={applications} selection={selection} />
      </div>
      <Pager
        summary={TEXT.count(count)}
        note={TEXT.appliedNote}
        count={count}
        page={page}
        pageSize={pageSize}
        onPage={onPage}
      />
    </>
  );
}

function applicationIds(list: ApplicationListState): number[] {
  return list.status === "loaded"
    ? list.page.applications.map((application) => application.id)
    : [];
}

type ApplicationsExportProps = {
  role: Role;
  list: ApplicationListState;
  filters: ApplicationFilters;
  counsellors: readonly CounsellorChoice[];
};

/** Export, for Admins only (spec 31b): the whole list with the filters on screen. */
function ApplicationsExport({ role, list, filters, counsellors }: ApplicationsExportProps) {
  if (role !== Role.Admin) return null;
  return (
    <ExportButton
      list="applications"
      count={list.status === "loaded" ? list.page.count : null}
      filters={exportFilters(applicationListQuery(filters, 1))}
      filtersText={applicationFiltersText(filters, counsellors)}
    />
  );
}

/** The Applications list's filters in words, for the export dialog. */
function applicationFiltersText(
  filters: ApplicationFilters,
  counsellors: readonly CounsellorChoice[],
): string {
  return describeFilters(
    [
      [EXPORT_TEXT.search, filters.search],
      [TEXT.status, filters.status === "" ? "" : APPLICATION_STATUS_LABELS[filters.status]],
      [TEXT.intake, filters.intake === "" ? "" : formatIntake(filters.intake)],
      [TEXT.year, filters.year],
      [TEXT.country, filters.country === "" ? "" : COUNTRY_LABELS[filters.country]],
      [TEXT.counsellor, counsellorWords(filters.counsellor, counsellors)],
    ],
    EXPORT_TEXT.noFilters,
  );
}
