"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { LABELS } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import {
  CatalogueRefusedError,
  deleteUniversity,
  saveUniversityEdit,
  UniversityEditRefusedError,
  type University,
  type UniversityEditField,
} from "@/lib/api";
import {
  checkDraft,
  draftOf,
  newCourseDraft,
  rowKeysSent,
  toEditInput,
  type CourseDraft,
  type UniversityDraft,
} from "@/lib/catalogue";

import { useLeaveGuard } from "../students/edit/useLeaveGuard";
import { ArchiveToggle } from "./ArchiveToggle";
import { catalogueFailure } from "./catalogueFailure";
import { CourseEditRow, type CourseRowErrors } from "./CourseEditRow";
import { UNIVERSITY_COUNTRY_OPTIONS } from "./options";
import { useOptionalDocumentTypes } from "./useOptionalDocumentTypes";

type Problems = {
  fields: Partial<Record<UniversityEditField, string[]>>;
  rows: Record<string, CourseRowErrors>;
};

const NO_PROBLEMS: Problems = { fields: {}, rows: {} };
const NO_ROW_ERRORS: CourseRowErrors = {};
const UNIVERSITY_WORDS = {
  archive: CATALOGUE_TEXT.archiveUniversity,
  restore: CATALOGUE_TEXT.restoreUniversity,
};

/** A key for a Course added on this page; never the same twice. */
let newCourses = 0;
function newKey(): string {
  newCourses += 1;
  return `new-${String(newCourses)}`;
}

/** Changes the page's draft, marking the page as changed. */
type ChangeDraft = (next: (current: UniversityDraft) => UniversityDraft) => void;

/**
 * A University's edit page (issue 92): its name, country and archive switch, and every Course
 * with its Intakes and Required documents. One Save stores everything or nothing; leaving with
 * unsaved changes asks first.
 */
export function UniversityEditForm({ university }: { university: University }) {
  const [draft, setDraft] = useState<UniversityDraft>(() => draftOf(university));
  const [isDirty, setIsDirty] = useState(false);
  const guard = useLeaveGuard(isDirty);
  const saving = useSaving(university, draft, guard.leaveFor);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstProblem(formRef, saving.problems);

  const change: ChangeDraft = (next) => {
    setDraft(next);
    setIsDirty(true);
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        title={CATALOGUE_TEXT.editTitle(university.name)}
        subtitle={CATALOGUE_TEXT.editIntro}
        crumbs={
          <Link
            href={ROUTES.catalogue}
            className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
          >
            <Icon name="left" />
            {CATALOGUE_TEXT.backToCatalogue}
          </Link>
        }
      />
      <form ref={formRef} noValidate onSubmit={saving.submit} className="grid min-w-0 gap-8">
        <UniversitySection
          university={university}
          draft={draft}
          errors={saving.problems.fields}
          change={change}
          onDeleted={() => {
            guard.leaveFor(ROUTES.catalogue);
          }}
        />
        <CoursesSection draft={draft} rows={saving.problems.rows} change={change} />
        <div className="bg-canvas border-rule sticky bottom-0 z-10 grid gap-4 border-t py-4">
          {saving.failure !== null && <Banner tone="problem">{saving.failure}</Banner>}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                guard.goTo(ROUTES.catalogue);
              }}
            >
              {LABELS.cancel}
            </Button>
            <Button type="submit" variant="primary" isLoading={saving.isSaving}>
              {CATALOGUE_TEXT.saveAll}
            </Button>
          </div>
        </div>
      </form>
      {guard.isAsking && (
        <ConfirmDialog
          title={CATALOGUE_TEXT.leaveTitle}
          actionLabel={CATALOGUE_TEXT.leave}
          cancelLabel={CATALOGUE_TEXT.keepEditing}
          onConfirm={() => {
            guard.leave();
            return Promise.resolve();
          }}
          onClose={guard.stay}
        >
          {CATALOGUE_TEXT.leaveBody}
        </ConfirmDialog>
      )}
    </div>
  );
}

type Saving = {
  isSaving: boolean;
  problems: Problems;
  failure: string | null;
  submit: (event: SubmitEvent<HTMLFormElement>) => void;
};

/** Check the page, then save it all at once; on success say so and go back to the Catalogue. */
function useSaving(
  university: University,
  draft: UniversityDraft,
  leaveFor: (href: string) => void,
): Saving {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [problems, setProblems] = useState<Problems>(NO_PROBLEMS);
  const [failure, setFailure] = useState<string | null>(null);

  async function save(): Promise<void> {
    setIsSaving(true);
    try {
      const saved = await saveUniversityEdit(university.id, toEditInput(draft));
      showToast(CATALOGUE_TEXT.editSaved(saved.name));
      leaveFor(ROUTES.catalogue);
    } catch (error) {
      setIsSaving(false);
      const refused = error instanceof UniversityEditRefusedError ? error : null;
      setProblems(refused === null ? NO_PROBLEMS : problemsOf(refused, rowKeysSent(draft)));
      setFailure(refused === null ? catalogueFailure(error) : refusedMessage(refused));
    }
  }

  return {
    isSaving,
    problems,
    failure,
    submit: (event) => {
      event.preventDefault();
      const found = checkDraft(draft);
      const hasProblems = Object.keys(found.fields).length + Object.keys(found.rows).length > 0;
      setProblems(found);
      setFailure(hasProblems ? CATALOGUE_TEXT.needsFixing : null);
      if (!hasProblems) void save();
    },
  };
}

/** After a refusal, the cursor goes to the first field marked wrong. */
function useFocusFirstProblem(form: RefObject<HTMLFormElement | null>, problems: Problems): void {
  useEffect(() => {
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [form, problems]);
}

type UniversitySectionProps = {
  university: University;
  draft: UniversityDraft;
  errors: Problems["fields"];
  change: ChangeDraft;
  onDeleted: () => void;
};

/** The University's name and country, Archive or Restore, and Delete once saved as archived. */
function UniversitySection({
  university,
  draft,
  errors,
  change,
  onDeleted,
}: UniversitySectionProps) {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const uses = draft.courses.reduce((sum, course) => sum + course.applications, 0);
  return (
    <Section
      title={CATALOGUE_TEXT.university}
      aside={
        <>
          {draft.archived && (
            <span className="flex flex-wrap items-center gap-2">
              <Chip hasDot={false}>{CATALOGUE_TEXT.archived}</Chip>
              {CATALOGUE_TEXT.universityArchivedNote}
            </span>
          )}
          <ArchiveToggle
            isArchived={draft.archived}
            words={UNIVERSITY_WORDS}
            onToggle={() => {
              change((current) => ({ ...current, archived: !current.archived }));
            }}
          />
          {draft.savedArchived && (
            <DeleteUniversity
              uses={uses}
              onAsk={() => {
                setIsDeleting(true);
              }}
            />
          )}
        </>
      }
    >
      <Panel isPadded>
        <div className="tablet:grid-cols-2 grid gap-5">
          <TextField
            label={CATALOGUE_TEXT.name}
            name="name"
            autoComplete="off"
            value={draft.name}
            onChange={(name) => {
              change((current) => ({ ...current, name }));
            }}
            errors={errors.name}
          />
          <SelectField
            label={CATALOGUE_TEXT.country}
            name="country"
            options={UNIVERSITY_COUNTRY_OPTIONS}
            value={draft.country}
            onChange={(country) => {
              change((current) => ({ ...current, country }));
            }}
            errors={errors.country}
          />
        </div>
      </Panel>
      {isDeleting && (
        <ConfirmDialog
          title={CATALOGUE_TEXT.deleteUniversityTitle(university.name)}
          actionLabel={CATALOGUE_TEXT.deleteUniversity}
          failureOf={deleteFailure}
          onConfirm={async () => {
            await deleteUniversity(university.id);
            setIsDeleting(false);
            showToast(CATALOGUE_TEXT.universityDeleted(university.name));
            onDeleted();
          }}
          onClose={() => {
            setIsDeleting(false);
          }}
        >
          {CATALOGUE_TEXT.deleteUniversityBody(university.courses.length)}
        </ConfirmDialog>
      )}
    </Section>
  );
}

/** Delete university (asking first), or disabled with why when an Application uses a Course. */
function DeleteUniversity({ uses, onAsk }: { uses: number; onAsk: () => void }) {
  if (uses > 0) {
    return (
      <>
        <Button variant="ghost" size="sm" icon="trash" isDisabled>
          {CATALOGUE_TEXT.deleteUniversity}
        </Button>
        <span>{CATALOGUE_TEXT.usedBy(uses)}</span>
      </>
    );
  }
  return (
    <Button variant="danger" size="sm" icon="trash" onClick={onAsk}>
      {CATALOGUE_TEXT.deleteUniversity}
    </Button>
  );
}

type CoursesSectionProps = {
  draft: UniversityDraft;
  rows: Problems["rows"];
  change: ChangeDraft;
};

/** Every Course of the University, and Add a course. */
function CoursesSection({ draft, rows, change }: CoursesSectionProps) {
  const types = useOptionalDocumentTypes();
  const [deleting, setDeleting] = useState<CourseDraft | null>(null);
  const live = draft.courses.filter((course) => !course.isDeleted);

  function changeCourse(key: string, update: Partial<CourseDraft>): void {
    change((current) => ({
      ...current,
      courses: current.courses.map((course) =>
        course.key === key ? { ...course, ...update } : course,
      ),
    }));
  }

  return (
    <Section title={CATALOGUE_TEXT.courses}>
      <Panel isPadded>
        <ul
          aria-label={CATALOGUE_TEXT.courseCount(live.length)}
          className="grid gap-4 empty:hidden"
        >
          {draft.courses.map((course) => (
            <CourseEditRow
              key={course.key}
              course={course}
              types={types}
              errors={rows[course.key] ?? NO_ROW_ERRORS}
              onChange={(update) => {
                changeCourse(course.key, update);
              }}
              onAskDelete={() => {
                setDeleting(course);
              }}
              onRemoveNew={() => {
                change((current) => ({
                  ...current,
                  courses: current.courses.filter((each) => each.key !== course.key),
                }));
              }}
            />
          ))}
        </ul>
        <div>
          <Button
            icon="plus"
            size="sm"
            onClick={() => {
              change((current) => ({
                ...current,
                courses: [...current.courses, newCourseDraft(newKey())],
              }));
            }}
          >
            {CATALOGUE_TEXT.addCourse}
          </Button>
        </div>
        <p className="text-secondary text-ink-2">{CATALOGUE_TEXT.coursesInUseNote}</p>
      </Panel>
      {deleting !== null && (
        <ConfirmDialog
          title={CATALOGUE_TEXT.deleteCourseTitle(deleting.name)}
          actionLabel={CATALOGUE_TEXT.deleteCourse}
          onConfirm={() => {
            changeCourse(deleting.key, { isDeleted: true });
            setDeleting(null);
            return Promise.resolve();
          }}
          onClose={() => {
            setDeleting(null);
          }}
        >
          {CATALOGUE_TEXT.deleteCourseBody}
        </ConfirmDialog>
      )}
    </Section>
  );
}

/** The server's reason a University stays (e.g. a Commission uses it), or a general failure. */
function deleteFailure(error: unknown): string {
  return error instanceof CatalogueRefusedError ? error.message : CATALOGUE_TEXT.deleteFailed;
}

/** "Some details need fixing…" and anything the server said that isn't about one field. */
function refusedMessage(refused: UniversityEditRefusedError): string {
  return [CATALOGUE_TEXT.needsFixing, ...refused.general].join(" ");
}

/** The server's refusal by field and by Course row (it names rows by their place when sent). */
function problemsOf(error: UniversityEditRefusedError, keys: readonly string[]): Problems {
  const rows: Record<string, CourseRowErrors> = {};
  for (const [place, found] of Object.entries(error.rows)) {
    const key = keys[Number(place)];
    if (key !== undefined) rows[key] = found;
  }
  return { fields: error.fields, rows };
}
