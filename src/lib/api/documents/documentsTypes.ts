import { z } from "zod";

import {
  BIN_ITEM_KINDS,
  DOCUMENT_GROUPS,
  DOCUMENT_LINK_KINDS,
  DOCUMENT_STATES,
  VERIFICATIONS,
} from "@/constants/documents";
import { Stage } from "@/constants/stages";
import { COUNTRIES } from "@/constants/students";

import { BinnedCourseFileSchema, type BinnedCourseFile } from "../catalogue/courseFileTypes";

const PersonSchema = z.object({ id: z.number().int(), name: z.string() });

const GroupSchema = z.enum(DOCUMENT_GROUPS);

/** One Document Type, whether every Student needs it, and its usual Document Group (issue 80). */
export const DocumentTypeSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    needed_by_everyone: z.boolean(),
    usual_group: GroupSchema,
  })
  .transform(({ needed_by_everyone, usual_group, ...rest }) => ({
    ...rest,
    neededByEveryone: needed_by_everyone,
    usualGroup: usual_group,
  }));

export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const DocumentTypeListSchema = z
  .object({ results: z.array(DocumentTypeSchema) })
  .transform(({ results }) => results);

const CountSchema = z.number().int().nonnegative();

/** A Document Type in Configuration, with where it is used (issues 40, 80). */
export const ConfiguredDocumentTypeSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    needed_by_everyone: z.boolean(),
    usual_group: GroupSchema,
    used_by: z.object({
      countries: CountSchema,
      courses: CountSchema,
      students: CountSchema,
      documents: CountSchema,
    }),
  })
  .transform(({ needed_by_everyone, usual_group, used_by, ...rest }) => ({
    ...rest,
    neededByEveryone: needed_by_everyone,
    usualGroup: usual_group,
    usedBy: used_by,
  }));

export type ConfiguredDocumentType = z.infer<typeof ConfiguredDocumentTypeSchema>;

export const ConfiguredDocumentTypeListSchema = z
  .object({ results: z.array(ConfiguredDocumentTypeSchema) })
  .transform(({ results }) => results);

/** A Document Type a Course also needs, by its id and name (issue 40). */
export const NamedDocumentTypeSchema = z.object({ id: z.number().int(), name: z.string() });

export type NamedDocumentType = z.infer<typeof NamedDocumentTypeSchema>;

/** One Country's document list (issue 80): each type, oldest first, in the group it goes in. */
export const CountryListSchema = z
  .object({
    country: z.enum(COUNTRIES),
    documents: z.array(
      z
        .object({ document_type: NamedDocumentTypeSchema, group: GroupSchema })
        .transform(({ document_type, group }) => ({ documentType: document_type, group })),
    ),
  })
  .transform(({ country, documents }) => ({ country, documents }));

export type CountryList = z.infer<typeof CountryListSchema>;

export const CountryListsSchema = z
  .object({ results: z.array(CountryListSchema) })
  .transform(({ results }) => results);

/** A new document made from a Country's list: the type and the list as stored (issue 97). */
export const NewCountryDocumentSchema = z
  .object({ document_type: ConfiguredDocumentTypeSchema, list: CountryListSchema })
  .transform(({ document_type, list }) => ({ documentType: document_type, list }));

export type NewCountryDocument = z.infer<typeof NewCountryDocumentSchema>;

/** One row of a Country's list as it is sent. */
export type CountryListRow = { typeId: number; group: (typeof DOCUMENT_GROUPS)[number] };

/** The Application or Visa a Document is for, with the University it is about (spec 66). */
const DocumentLinkedToSchema = z.object({
  kind: z.enum(DOCUMENT_LINK_KINDS),
  id: z.number().int(),
  university: z.string(),
});

export type DocumentLinkedTo = z.infer<typeof DocumentLinkedToSchema>;

/** A Staff member, or a Platform Admin with no Staff id (issue 27). */
const ActorSchema = z.object({ id: z.number().int().nullable(), name: z.string() });

/** Who put something in the Bin, when and why (issue 79). */
const BinNoteSchema = z.object({
  by: ActorSchema,
  at: z.iso.datetime({ offset: true }),
  reason: z.string(),
});

export type BinNote = z.infer<typeof BinNoteSchema>;

/** A file named only: what it is opened by and shown as. */
const FileNameSchema = z
  .object({ id: z.number().int(), file_name: z.string() })
  .transform(({ id, file_name }) => ({ id, fileName: file_name }));

/** One file of a Document waiting in the Bin: its name and why; it can't be opened here. */
const BinnedFileSchema = z
  .object({ id: z.number().int(), file_name: z.string(), bin: BinNoteSchema })
  .transform(({ id, file_name, bin }) => ({ id, fileName: file_name, bin }));

export type BinnedFile = z.infer<typeof BinnedFileSchema>;

/** A whole Document waiting in the Bin, shown greyed on the checklist (issue 79). */
const BinnedDocumentSchema = z.object({
  id: z.number().int(),
  files: z.array(FileNameSchema),
  bin: BinNoteSchema,
});

export type BinnedDocument = z.infer<typeof BinnedDocumentSchema>;

/** One file of a Document (issue 78): its shown name, type and size, and who added it when. */
const DocumentFileSchema = z
  .object({
    id: z.number().int(),
    file_name: z.string(),
    content_type: z.string(),
    size: z.number().int().nonnegative(),
    uploaded_at: z.iso.datetime({ offset: true }),
    uploaded_by: PersonSchema.nullable(),
  })
  .transform((file) => ({
    id: file.id,
    fileName: file.file_name,
    contentType: file.content_type,
    size: file.size,
    uploadedAt: file.uploaded_at,
    uploadedBy: file.uploaded_by,
  }));

export type DocumentFile = z.infer<typeof DocumentFileSchema>;

/**
 * A Document: its files (one or more, oldest first), how it was judged as a whole (and why it
 * was Rejected) and what it is for.
 */
const StoredDocumentSchema = z
  .object({
    id: z.number().int(),
    files: z.array(DocumentFileSchema).nonempty(),
    /** Its files waiting in the Bin (issue 79). */
    binned_files: z.array(BinnedFileSchema).default([]),
    verification: z.enum(VERIFICATIONS),
    rejection_reason: z.string(),
    link: DocumentLinkedToSchema.nullable(),
    uploaded_at: z.iso.datetime({ offset: true }),
    uploaded_by: PersonSchema.nullable(),
  })
  .transform((document) => ({
    id: document.id,
    files: document.files,
    binnedFiles: document.binned_files,
    verification: document.verification,
    rejectionReason: document.rejection_reason,
    link: document.link,
    uploadedAt: document.uploaded_at,
    uploadedBy: document.uploaded_by,
  }));

export type StoredDocument = z.infer<typeof StoredDocumentSchema>;

const ChecklistItemSchema = z
  .object({
    document_type: PersonSchema,
    reason: z.string(),
    is_required: z.boolean(),
    added_for_student: z.boolean(),
    /** Applying, Visa or Statements; null for one under "Other documents" (issue 80). */
    group: GroupSchema.nullable(),
    state: z.enum(DOCUMENT_STATES),
    document: StoredDocumentSchema.nullable(),
    /** The type's Documents waiting in the Bin, newest first (issue 79). */
    in_bin: z.array(BinnedDocumentSchema).default([]),
  })
  .transform((item) => ({
    documentType: item.document_type,
    reason: item.reason,
    isRequired: item.is_required,
    addedForStudent: item.added_for_student,
    group: item.group,
    state: item.state,
    document: item.document,
    inBin: item.in_bin,
  }));

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

/** A Student's checklist, the types asked for them alone, and whether the viewer may upload. */
export const ChecklistSchema = z
  .object({
    done: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    can_change: z.boolean(),
    /** An Admin's deletes skip the Bin (issue 79). */
    deletes_for_good: z.boolean().default(false),
    /** Who is looking, to offer "Take it out" on what they put in the Bin; null for a Platform Admin. */
    viewer_id: z.number().int().nullable().default(null),
    asked: z.array(z.number().int()),
    items: z.array(ChecklistItemSchema),
  })
  .transform(({ can_change, deletes_for_good, viewer_id, ...rest }) => ({
    ...rest,
    canChange: can_change,
    deletesForGood: deletes_for_good,
    viewerId: viewer_id,
  }));

export type Checklist = z.infer<typeof ChecklistSchema>;

/** A file as an Application or Visa lists it: what it is opened by and shown as (issue 78). */
export const NamedFileSchema = z
  .object({ id: z.number().int(), file_name: z.string() })
  .transform(({ id, file_name }) => ({ id, fileName: file_name }));

export type NamedFile = z.infer<typeof NamedFileSchema>;

/** A Document as an Application or Visa lists it (spec 66), with every file. */
export const LinkedDocumentSchema = z
  .object({
    id: z.number().int(),
    document_type: PersonSchema,
    files: z.array(NamedFileSchema).nonempty(),
    verification: z.enum(VERIFICATIONS),
  })
  .transform(({ document_type, ...rest }) => ({ ...rest, documentType: document_type }));

export type LinkedDocument = z.infer<typeof LinkedDocumentSchema>;

/** An Application or Visa offered as a link when uploading, with the words to show. */
export type DocumentLinkOption = { kind: DocumentLinkedTo["kind"]; id: number; label: string };

/** Mark a Document correct, or Rejected with the reason (spec 68). */
export type DocumentCheck =
  { verification: "verified" } | { verification: "rejected"; reason: string };

/** A link to a Document that works for a few minutes. Only web links are ever opened. */
export const DocumentLinkSchema = z
  .object({
    url: z.url({ protocol: /^https?$/ }),
    expires_in: z.number().int().positive(),
  })
  .transform(({ url, expires_in }) => ({ url, expiresIn: expires_in }));

const CountsFields = {
  rejected: z.number().int().nonnegative(),
  waiting: z.number().int().nonnegative(),
  missing: z.number().int().nonnegative(),
  verified: z.number().int().nonnegative(),
};

export const PaperworkCountsSchema = z.object(CountsFields);
export type PaperworkCounts = z.infer<typeof PaperworkCountsSchema>;

/** One Student on the Documents page. */
const PaperworkRowSchema = z
  .object({
    student: z.object({
      id: z.number().int(),
      name: z.string(),
      stage: z.enum(Stage),
      country: z.enum(COUNTRIES),
      assigned_counsellor: PersonSchema.nullable(),
    }),
    done: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    ...CountsFields,
  })
  .transform(({ student, ...rest }) => ({
    ...rest,
    student: {
      id: student.id,
      name: student.name,
      stage: student.stage,
      country: student.country,
      assignedCounsellor: student.assigned_counsellor,
    },
  }));

export type PaperworkRow = z.infer<typeof PaperworkRowSchema>;

/** One page of the Documents page, with the totals of the whole list. */
export const PaperworkPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    totals: PaperworkCountsSchema,
    results: z.array(PaperworkRowSchema),
  })
  .transform(({ page_size, results, ...rest }) => ({
    ...rest,
    pageSize: page_size,
    rows: results,
  }));

export type PaperworkPage = z.infer<typeof PaperworkPageSchema>;

/** One item on the Bin tab: a whole Document or one file, its Student, files, who and why. */
const BinItemSchema = z
  .object({
    kind: z.enum(BIN_ITEM_KINDS),
    document: PersonSchema,
    student: PersonSchema,
    files: z.array(FileNameSchema).nonempty(),
    ...BinNoteSchema.shape,
  })
  .transform(({ kind, document, student, files, by, at, reason }) => ({
    kind,
    document,
    student,
    files,
    bin: { by, at, reason },
  }));

export type BinItem = z.infer<typeof BinItemSchema>;

/** Anything on the Bin tab: a Document, one of its files, or a Course File (ticket 10). */
export type BinEntry = BinItem | BinnedCourseFile;

/** One page of the Bin tab, newest first. */
export const BinPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(z.union([BinItemSchema, BinnedCourseFileSchema])),
  })
  .transform(({ page_size, results, ...rest }) => ({
    ...rest,
    pageSize: page_size,
    items: results,
  }));

export type BinPage = z.infer<typeof BinPageSchema>;

/** A whole Document (`fileId` null) or one of its files: what the Bin acts on. */
export type BinTarget = { documentId: number; fileId: number | null };
