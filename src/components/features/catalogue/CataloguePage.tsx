"use client";

import { useState } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { SearchBox } from "@/components/ui/SearchBox";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/useToast";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CatalogueRefusedError, setCourseIntakes, type Course } from "@/lib/api";
import { formatIntake } from "@/lib/dates";

import { CatalogueDialog, type OpenDialog } from "./CatalogueDialog";
import { catalogueFailure } from "./catalogueFailure";
import { ImportDialog } from "./ImportDialog";
import { UniversityCard, type CardActions } from "./UniversityCard";
import { useUniversityList, type UniversityListState } from "./useUniversityList";

const SEARCH_DELAY_MS = 300;

/** An Intake waiting to be removed from a Course, after asking. */
type Removing = { course: Course; intake: string } | null;

/** The Catalogue, for Admins: each University as a card with all its Courses (issue 92). */
export function CataloguePage() {
  const { staff } = useCurrentStaff();
  if (staff.role !== Role.Admin) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <AdminCataloguePage />;
}

function AdminCataloguePage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [removing, setRemoving] = useState<Removing>(null);
  const [isImporting, setIsImporting] = useState(false);
  const settledSearch = useDebouncedValue(search, SEARCH_DELAY_MS);
  const list = useUniversityList({ search: settledSearch, includeArchived }, page, version);
  const reload = () => {
    setVersion((current) => current + 1);
  };

  const actions: CardActions = {
    onAddCourse: (university) => {
      setDialog({ kind: "course", university });
    },
    onAddIntake: (course) => {
      setDialog({ kind: "intakes", course });
    },
    onRemoveIntake: (course, intake) => {
      setRemoving({ course, intake });
    },
  };

  return (
    <>
      <PageHeader
        title={CATALOGUE_TEXT.title}
        subtitle={CATALOGUE_TEXT.intro}
        actions={
          <>
            <Button
              icon="upload"
              onClick={() => {
                setIsImporting(true);
              }}
            >
              {CATALOGUE_TEXT.importButton}
            </Button>
            <Button
              variant="primary"
              icon="plus"
              onClick={() => {
                setDialog({ kind: "university" });
              }}
            >
              {CATALOGUE_TEXT.addUniversity}
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <SearchBox
          label={CATALOGUE_TEXT.search}
          placeholder={CATALOGUE_TEXT.search}
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <Switch
          label={CATALOGUE_TEXT.showArchived}
          isOn={includeArchived}
          onChange={(isOn) => {
            setIncludeArchived(isOn);
            setPage(1);
          }}
        />
      </div>
      <ListContent
        list={list}
        hasSearch={settledSearch.trim() !== ""}
        onPage={setPage}
        actions={actions}
      />
      <CatalogueDialog
        dialog={dialog}
        onClose={() => {
          setDialog(null);
        }}
        onSaved={() => {
          setDialog(null);
          reload();
        }}
      />
      {removing !== null && (
        <ConfirmDialog
          title={CATALOGUE_TEXT.removeIntakeTitle(
            formatIntake(removing.intake),
            removing.course.name,
          )}
          actionLabel={CATALOGUE_TEXT.remove}
          failureOf={removeFailure}
          onConfirm={async () => {
            const { course, intake } = removing;
            if (course.intakes.length === 1) {
              throw new CatalogueRefusedError(CATALOGUE_TEXT.keepOneIntake);
            }
            await setCourseIntakes(
              course.id,
              course.intakes.filter((kept) => kept !== intake),
            );
            setRemoving(null);
            showToast(CATALOGUE_TEXT.intakeRemoved(formatIntake(intake), course.name));
            reload();
          }}
          onClose={() => {
            setRemoving(null);
          }}
        >
          {CATALOGUE_TEXT.removeIntakeBody}
        </ConfirmDialog>
      )}
      {isImporting && (
        <ImportDialog
          onClose={() => {
            setIsImporting(false);
          }}
          onImported={reload}
        />
      )}
    </>
  );
}

/** Why an Intake wasn't removed: the last one of an active Course stays, or another failure. */
function removeFailure(error: unknown): string {
  return error instanceof CatalogueRefusedError ? error.message : catalogueFailure(error);
}

type ListContentProps = {
  list: UniversityListState;
  hasSearch: boolean;
  onPage: (page: number) => void;
  actions: CardActions;
};

function ListContent({ list, hasSearch, onPage, actions }: ListContentProps) {
  if (list.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (list.status === "failed") return <Banner tone="problem">{CATALOGUE_TEXT.loadFailed}</Banner>;
  const { page } = list;
  if (page.universities.length === 0) {
    return (
      <Panel>
        <EmptyState>
          {hasSearch ? CATALOGUE_TEXT.noMatches : CATALOGUE_TEXT.noUniversities}
        </EmptyState>
      </Panel>
    );
  }
  return (
    <div className="grid min-w-0 gap-6">
      {page.universities.map((university) => (
        <UniversityCard key={university.id} university={university} {...actions} />
      ))}
      <Panel>
        <Pager
          summary={CATALOGUE_TEXT.universityCount(page.count)}
          count={page.count}
          page={page.page}
          pageSize={page.pageSize}
          onPage={onPage}
        />
      </Panel>
    </div>
  );
}
