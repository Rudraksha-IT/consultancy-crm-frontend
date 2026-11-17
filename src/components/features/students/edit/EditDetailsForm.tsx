"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionMenu, useSectionChoice, type MenuSection } from "@/components/ui/SectionMenu";
import { useToast } from "@/components/ui/useToast";
import { HTTP_STATUS } from "@/constants/api";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { EDIT_DETAILS_TEXT, PROFILE_TEXT } from "@/constants/studentProfile";
import {
  ApiRequestError,
  EDIT_LISTS,
  InvalidFieldsError,
  saveEditDetails,
  type EditDetailsInput,
  type EditList,
  type StudentDetailsChange,
  type StudentProfile,
} from "@/lib/api";

import type { SectionEdit } from "../profile/sectionForms";
import {
  ADDRESSES_EDIT,
  CONTACT_EDIT,
  EDUCATION_EDIT,
  FAMILY_EDIT,
  PASSPORT_EDIT,
  PERSONAL_EDIT,
  PLANS_EDIT,
} from "../profile/sectionForms";
import { EditRows, type RowState } from "./EditRows";
import { LIST_KINDS, readRow } from "./listRows";
import { useLeaveGuard } from "./useLeaveGuard";

type PageSection =
  { id: string; title: string; edit: SectionEdit } | { id: string; title: string; list: EditList };

/** The page's sections, in the Profile tab's order (spec 35f). */
const SECTIONS: readonly PageSection[] = [
  { id: "personal", title: PROFILE_TEXT.personal, edit: PERSONAL_EDIT },
  { id: "contact", title: PROFILE_TEXT.contact, edit: CONTACT_EDIT },
  { id: "family", title: PROFILE_TEXT.family, edit: FAMILY_EDIT },
  { id: "passport", title: PROFILE_TEXT.passport, edit: PASSPORT_EDIT },
  { id: "addresses", title: PROFILE_TEXT.addresses, edit: ADDRESSES_EDIT },
  { id: "education", title: PROFILE_TEXT.education, edit: EDUCATION_EDIT },
  { id: "academics", title: LIST_KINDS.academicRecords.title, list: "academicRecords" },
  { id: "work", title: LIST_KINDS.workExperience.title, list: "workExperience" },
  { id: "tests", title: LIST_KINDS.testScores.title, list: "testScores" },
  { id: "plans", title: PROFILE_TEXT.plans, edit: PLANS_EDIT },
];

type Rows = Record<EditList, RowState[]>;

const INVALID = '[aria-invalid="true"]';
const LIST_ERROR = "[data-list-error]";
const SECTION_BOX = "[data-section]";

type Errors = Partial<Record<string, string[]>>;

let nextRowKey = 0;

function newKey(): string {
  nextRowKey += 1;
  return `r${String(nextRowKey)}`;
}

function storedRows(profile: StudentProfile): Rows {
  const rowsOf = (list: EditList): RowState[] =>
    LIST_KINDS[list].stored(profile).map(({ id, values }) => ({
      key: newKey(),
      id,
      values,
      isRemoved: false,
    }));
  return {
    academicRecords: rowsOf("academicRecords"),
    testScores: rowsOf("testScores"),
    workExperience: rowsOf("workExperience"),
  };
}

/**
 * Edit every detail and list of one Student on one page, saved together by one Save or not at
 * all (issue 81, spec 122). One section is shown at a time from the section menu (issue 96); the
 * others stay in the form, only hidden, so nothing typed is lost. A failed save opens the section
 * with the problem. Leaving with unsaved changes asks first.
 */
export function EditDetailsForm({ profile }: { profile: StudentProfile }) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Rows>(() => storedRows(profile));
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const guard = useLeaveGuard(isDirty);
  const back = ROUTES.student(profile.id);

  const choice = useSectionChoice("personal");
  useOpenFailingSection(formRef, errors, choice.choose);

  function changeRows(list: EditList, change: (current: RowState[]) => RowState[]): void {
    setRows((current) => ({ ...current, [list]: change(current[list]) }));
    setIsDirty(true);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sent = sentRows(rows);
    const input: EditDetailsInput = {
      version: profile.detailsVersion,
      details: SECTIONS.reduce<StudentDetailsChange>(
        (all, part) => ("edit" in part ? { ...all, ...part.edit.read(form) } : all),
        {},
      ),
      academicRecords: sent.academicRecords.map((row) => ({
        id: row.id,
        ...readAcademicRecord(form, row),
      })),
      testScores: sent.testScores.map((row) => ({ id: row.id, ...readTestScore(form, row) })),
      workExperience: sent.workExperience.map((row) => ({ id: row.id, ...readJob(form, row) })),
    };
    void save(input, sent);
  }

  async function save(input: EditDetailsInput, sent: Rows): Promise<void> {
    setIsSaving(true);
    setErrors({});
    setFailure(null);
    try {
      await saveEditDetails(profile.id, input);
      showToast(EDIT_DETAILS_TEXT.allSaved);
      guard.leaveFor(back);
    } catch (error) {
      setIsSaving(false);
      if (error instanceof InvalidFieldsError) {
        setErrors(namedByRow(error.fieldErrors, sent));
        setFailure(EDIT_DETAILS_TEXT.needsFixing);
      } else {
        setFailure(failureMessage(error));
      }
    }
  }

  const sections: MenuSection[] = SECTIONS.map((part) => ({
    id: part.id,
    title: part.title,
    content: (
      <Panel isPadded>
        {"edit" in part ? (
          <part.edit.Fields profile={profile} errors={errors} />
        ) : (
          <EditRows
            list={part.list}
            kind={LIST_KINDS[part.list]}
            rows={rows[part.list]}
            errors={errors}
            onAdd={() => {
              changeRows(part.list, (current) => [
                ...current,
                {
                  key: newKey(),
                  id: null,
                  values: LIST_KINDS[part.list].blank,
                  isRemoved: false,
                },
              ]);
            }}
            onToggle={(key) => {
              changeRows(part.list, (current) => toggled(current, key));
            }}
          />
        )}
        {"list" in part && errors[part.list] !== undefined && (
          <div data-list-error="">
            <Banner tone="problem">{errors[part.list]?.join(" ")}</Banner>
          </div>
        )}
      </Panel>
    ),
  }));

  return (
    <div className="grid gap-8">
      <PageHeader
        title={EDIT_DETAILS_TEXT.title(profile.name)}
        subtitle={EDIT_DETAILS_TEXT.intro}
        crumbs={
          <Link
            href={back}
            className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
          >
            <Icon name="left" />
            {profile.name}
          </Link>
        }
      />
      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        onChange={() => {
          setIsDirty(true);
        }}
        className="min-w-0"
      >
        <SectionMenu
          label={EDIT_DETAILS_TEXT.sections}
          backLabel={EDIT_DETAILS_TEXT.allSections}
          sections={sections}
          choice={choice}
          keepsAllMounted
          footer={
            <div className="bg-canvas border-rule max-phone:bottom-above-tabbar sticky bottom-0 z-10 grid gap-4 border-t py-4">
              {failure !== null && <Banner tone="problem">{failure}</Banner>}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => {
                    guard.goTo(back);
                  }}
                >
                  {LABELS.cancel}
                </Button>
                <Button type="submit" variant="primary" isLoading={isSaving}>
                  {EDIT_DETAILS_TEXT.saveAll}
                </Button>
              </div>
            </div>
          }
        />
      </form>
      {guard.isAsking && (
        <ConfirmDialog
          title={EDIT_DETAILS_TEXT.leaveTitle}
          actionLabel={EDIT_DETAILS_TEXT.leave}
          cancelLabel={EDIT_DETAILS_TEXT.keepEditing}
          onConfirm={() => {
            guard.leave();
            return Promise.resolve();
          }}
          onClose={guard.stay}
        >
          {EDIT_DETAILS_TEXT.leaveBody}
        </ConfirmDialog>
      )}
    </div>
  );
}

/**
 * After a failed save, shows the first section with a refused field or row (at phone width
 * opening it from the list), then moves focus to its first refused field once it is shown.
 */
function useOpenFailingSection(
  formRef: RefObject<HTMLFormElement | null>,
  errors: Errors,
  choose: (id: string) => void,
): void {
  const focusIn = useRef<string | null>(null);

  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    const id = failingSection(formRef.current);
    if (id === null) return;
    focusIn.current = id;
    choose(id);
  }, [formRef, errors, choose]);

  // Every draw: the section may only be shown on the draw after it was chosen.
  useEffect(() => {
    const id = focusIn.current;
    if (id === null) return;
    const box = shownSectionBox(formRef.current, id);
    if (box === null) return;
    focusIn.current = null;
    box.querySelector<HTMLElement>(INVALID)?.focus();
  });
}

function failingSection(form: HTMLFormElement | null): string | null {
  const problem = form?.querySelector(`${INVALID}, ${LIST_ERROR}`);
  return problem?.closest<HTMLElement>(SECTION_BOX)?.dataset.section ?? null;
}

/** The section's box once it is shown; null while it is still hidden. */
function shownSectionBox(form: HTMLFormElement | null, id: string): HTMLElement | null {
  const boxes = form === null ? [] : [...form.querySelectorAll<HTMLElement>(SECTION_BOX)];
  return boxes.find((box) => box.dataset.section === id && !box.hidden) ?? null;
}

/** A stored row is marked (or unmarked); a new row is simply taken away. */
function toggled(rows: RowState[], key: string): RowState[] {
  return rows.flatMap((row) => {
    if (row.key !== key) return [row];
    if (row.id === null) return [];
    return [{ ...row, isRemoved: !row.isRemoved }];
  });
}

/** The rows that are sent: every row not marked to be removed, in order. */
function sentRows(rows: Rows): Rows {
  const live = (list: EditList) => rows[list].filter((row) => !row.isRemoved);
  return {
    academicRecords: live("academicRecords"),
    testScores: live("testScores"),
    workExperience: live("workExperience"),
  };
}

function prefixOf(list: EditList, row: RowState): string {
  return `${list}.${row.key}`;
}

function readAcademicRecord(form: FormData, row: RowState) {
  const values = readRow(form, prefixOf("academicRecords", row), LIST_KINDS.academicRecords.fields);
  return {
    level: values.level ?? "",
    institution: values.institution ?? "",
    finishedYear: values.finishedYear ?? "",
    result: values.result ?? "",
  };
}

function readTestScore(form: FormData, row: RowState) {
  const values = readRow(form, prefixOf("testScores", row), LIST_KINDS.testScores.fields);
  return {
    test: values.test ?? "",
    overall: values.overall ?? "",
    takenOn: values.takenOn ?? "",
    details: values.details ?? "",
  };
}

function readJob(form: FormData, row: RowState) {
  const values = readRow(form, prefixOf("workExperience", row), LIST_KINDS.workExperience.fields);
  return {
    employer: values.employer ?? "",
    jobTitle: values.jobTitle ?? "",
    startedOn: values.startedOn ?? "",
    endedOn: values.endedOn ?? "",
  };
}

/**
 * Refusals named as the form names its fields: "academicRecords.1.institution" (the second row
 * sent) becomes "academicRecords.<that row's key>.institution".
 */
function namedByRow(fieldErrors: Errors, sent: Rows): Errors {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([name, messages]) => [rowFieldName(name, sent), messages]),
  );
}

/** "academicRecords.1.institution" with the key of the second row sent; other names as they are. */
function rowFieldName(name: string, sent: Rows): string {
  const parts = name.split(".");
  const kind = EDIT_LISTS.find((known) => known === parts[0]);
  if (kind === undefined) return name;
  const row = sent[kind][Number(parts[1])];
  return row === undefined ? name : `${prefixOf(kind, row)}.${parts[2] ?? ""}`;
}

function failureMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return MESSAGES.saveFailed;
  if (error.status === HTTP_STATUS.conflict) return EDIT_DETAILS_TEXT.changedMeanwhile;
  if (error.status === HTTP_STATUS.forbidden) return MESSAGES.cannotChangeStudent;
  return MESSAGES.saveFailed;
}
