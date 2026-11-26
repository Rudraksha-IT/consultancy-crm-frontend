"use client";

import { useState } from "react";

import { counsellorWords } from "@/components/features/exports/counsellorWords";
import { ExportButton } from "@/components/features/exports/ExportButton";
import { ChecklistDialog } from "@/components/features/documents/ChecklistDialog";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { canBeAssignedStudents } from "@/components/features/students/counsellorFilter";
import { useCounsellorChoices } from "@/components/features/students/useCounsellorChoices";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { EXPORT_TEXT } from "@/constants/exports";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { COUNTRY_LABELS } from "@/constants/students";
import {
  APPOINTMENT_WHEN_LABELS,
  AppointmentWhen,
  VISA_LIST_TEXT as TEXT,
  VISA_STATUS_LABELS,
} from "@/constants/visas";
import type { CounsellorChoice, OfficeVisa } from "@/lib/api";
import { formatIntake, todayIso } from "@/lib/dates";
import { describeFilters, exportFilters } from "@/lib/exports";
import { defaultVisaFilters, hasAnyVisaFilter, visaListQuery, type VisaFilters } from "@/lib/visas";

import { useVisaFilterChoices } from "./useVisaFilterChoices";
import { useVisaList, type VisaListState } from "./useVisaList";
import { VisaFilterBar } from "./VisaFilterBar";
import { VisaTable } from "./VisaTable";

type VisasPageProps = {
  /** When an appointment is: the Home's link starts on the next 7 days (issues 52, 75). */
  initialAppointment?: AppointmentWhen;
};

/** Every Visa in the office, for every Role but Teachers (spec 62b). */
export function VisasPage({ initialAppointment = AppointmentWhen.Any }: VisasPageProps) {
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
  return <VisaList role={staff.role} initialAppointment={initialAppointment} />;
}

type VisaListProps = { role: Role; initialAppointment: AppointmentWhen };

function VisaList({ role, initialAppointment }: VisaListProps) {
  const [filters, setFilters] = useState<VisaFilters>(() => ({
    ...defaultVisaFilters(role),
    appointment: initialAppointment,
  }));
  const [page, setPage] = useState(1);
  // Bumped when a checklist closes, so the document counts are read again.
  const [version, setVersion] = useState(0);
  const [checklistOf, setChecklistOf] = useState<OfficeVisa["student"] | null>(null);
  const choices = useVisaFilterChoices();
  const counsellors = useCounsellorChoices();
  const list = useVisaList(filters, page, version);

  return (
    <>
      <PageHeader
        title={TEXT.title}
        subtitle={TEXT.subtitle}
        isActionBesideTitle
        actions={
          <VisasExport role={role} list={list} filters={filters} counsellors={counsellors} />
        }
      />
      <Panel>
        <VisaFilterBar
          filters={filters}
          onChange={(change) => {
            setFilters((current) => ({ ...current, ...change }));
            setPage(1);
          }}
          choices={choices}
          counsellors={counsellors}
          canBeAssigned={canBeAssignedStudents(role)}
          resultText={list.status === "loaded" ? TEXT.count(list.page.count) : undefined}
        />
        <ListContent
          list={list}
          isFiltered={hasAnyVisaFilter(filters)}
          onPage={setPage}
          onOpenDocuments={(visa) => {
            setChecklistOf(visa.student);
          }}
        />
      </Panel>
      {checklistOf !== null && (
        <ChecklistDialog
          student={checklistOf}
          onClose={() => {
            setChecklistOf(null);
            setVersion((current) => current + 1);
          }}
        />
      )}
    </>
  );
}

type ListContentProps = {
  list: VisaListState;
  isFiltered: boolean;
  onPage: (page: number) => void;
  onOpenDocuments: (visa: OfficeVisa) => void;
};

function ListContent({ list, isFiltered, onPage, onOpenDocuments }: ListContentProps) {
  if (list.status === "loading") return <p className="text-ink-2 p-6">{TEXT.loading}</p>;
  if (list.status === "failed") {
    return (
      <div className="p-6">
        <Banner tone="problem">{TEXT.failed}</Banner>
      </div>
    );
  }
  const { count, page, pageSize, visas } = list.page;
  if (visas.length === 0) {
    return <EmptyState>{isFiltered ? TEXT.noneMatch : TEXT.none}</EmptyState>;
  }
  return (
    <>
      {/* All seven columns fit: long names and courses are cut with … and dates may wrap
          (ui/DataTable `shrinks`, `wraps`). The box only scrolls as a last resort, never the page. `relative` keeps the hidden column labels
          inside it too. */}
      <div
        role="region"
        aria-label={TEXT.title}
        tabIndex={0}
        className="relative min-w-0 overflow-x-auto focus-visible:-outline-offset-4"
      >
        <VisaTable visas={visas} onOpenDocuments={onOpenDocuments} />
      </div>
      <Pager
        summary={TEXT.count(count)}
        count={count}
        page={page}
        pageSize={pageSize}
        onPage={onPage}
      />
    </>
  );
}

type VisasExportProps = {
  role: Role;
  list: VisaListState;
  filters: VisaFilters;
  counsellors: readonly CounsellorChoice[];
};

/** Export, for Admins only (spec 31b): the whole list with the filters on screen. */
function VisasExport({ role, list, filters, counsellors }: VisasExportProps) {
  if (role !== Role.Admin) return null;
  return (
    <ExportButton
      list="visas"
      count={list.status === "loaded" ? list.page.count : null}
      filters={exportFilters(visaListQuery(filters, 1, todayIso()))}
      filtersText={visaFiltersText(filters, counsellors)}
    />
  );
}

/** The Visas list's filters in words, for the export dialog. */
function visaFiltersText(filters: VisaFilters, counsellors: readonly CounsellorChoice[]): string {
  return describeFilters(
    [
      [TEXT.status, filters.status === "" ? "" : VISA_STATUS_LABELS[filters.status]],
      [TEXT.country, filters.country === "" ? "" : COUNTRY_LABELS[filters.country]],
      [TEXT.intake, filters.intake === "" ? "" : formatIntake(filters.intake)],
      [TEXT.counsellor, counsellorWords(filters.counsellor, counsellors)],
      [
        TEXT.appointment,
        filters.appointment === AppointmentWhen.Any
          ? ""
          : APPOINTMENT_WHEN_LABELS[filters.appointment],
      ],
    ],
    EXPORT_TEXT.noFilters,
  );
}
