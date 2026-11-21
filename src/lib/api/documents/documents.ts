import type { RecordId } from "@/lib/recordId";
import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";
import type { DocumentGroup, PaperworkScope } from "@/constants/documents";
import type { Country } from "@/constants/students";

import {
  deleteJson,
  getJson,
  patchJson,
  postForm,
  postJson,
  putJson,
  sendWithoutBody,
} from "../core/client";
import {
  BinPageSchema,
  ChecklistSchema,
  ConfiguredDocumentTypeListSchema,
  ConfiguredDocumentTypeSchema,
  CountryListSchema,
  CountryListsSchema,
  DocumentLinkSchema,
  DocumentTypeListSchema,
  DocumentTypeSchema,
  NewCountryDocumentSchema,
  PaperworkPageSchema,
  type BinPage,
  type BinTarget,
  type Checklist,
  type ConfiguredDocumentType,
  type CountryList,
  type CountryListRow,
  type DocumentCheck,
  type DocumentLinkedTo,
  type DocumentType,
  type NewCountryDocument,
  type PaperworkPage,
} from "./documentsTypes";
import { ApiRequestError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";
import { DetailAnswerSchema } from "../core/types";

/** The upload form's fields, by their API names. A link is sent as one of the last two. */
const UPLOAD_FIELDS = {
  documentType: "document_type",
  file: "file",
  linkApplication: "application",
  linkVisa: "visa",
} as const;
export type UploadField = keyof typeof UPLOAD_FIELDS;

const LINK_FIELDS: Record<DocumentLinkedTo["kind"], string> = {
  application: UPLOAD_FIELDS.linkApplication,
  visa: UPLOAD_FIELDS.linkVisa,
};

/** A Student's checklist (spec 64). */
export function fetchChecklist(
  studentId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<Checklist> {
  return getJson(API_PATHS.studentDocuments(studentId), ChecklistSchema, fetchFn);
}

/** Every file under the same `file` field, in order: the pages of one Document (issue 78). */
function appendFiles(form: FormData, files: readonly File[]): FormData {
  for (const file of files) form.append(UPLOAD_FIELDS.file, file);
  return form;
}

/** The upload form: the type, the files and, when there is one, the link's own field. */
function uploadForm(
  documentTypeId: RecordId,
  files: readonly File[],
  link: Pick<DocumentLinkedTo, "kind" | "id"> | null,
): FormData {
  const form = new FormData();
  form.append(UPLOAD_FIELDS.documentType, documentTypeId);
  appendFiles(form, files);
  if (link !== null) form.append(LINK_FIELDS[link.kind], link.id);
  return form;
}

/**
 * Upload one or more files as one Document of one type (spec 65, 117), optionally linked to
 * one of the Student's Applications or Visas (spec 66); it starts Pending Verification (spec
 * 67). Returns the checklist as it is now. Rejects with `InvalidFieldsError` naming the refused
 * field.
 */
export async function uploadDocument(
  studentId: RecordId,
  documentTypeId: RecordId,
  files: readonly File[],
  fetchFn: typeof fetch = fetch,
  link: Pick<DocumentLinkedTo, "kind" | "id"> | null = null,
): Promise<Checklist> {
  const form = uploadForm(documentTypeId, files, link);
  try {
    return await postForm(API_PATHS.studentDocuments(studentId), form, ChecklistSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, UPLOAD_FIELDS) ?? error;
  }
}

/**
 * Add one or more files to a Document (issue 78); a Verified one needs checking again. Returns
 * the checklist as it is now. Rejects with `InvalidFieldsError` on `file` when the files are
 * refused, or `ApiRequestError` with the server's reason (e.g. a Rejected Document).
 */
export async function addDocumentFiles(
  studentId: RecordId,
  documentId: RecordId,
  files: readonly File[],
  fetchFn: typeof fetch = fetch,
): Promise<Checklist> {
  const form = appendFiles(new FormData(), files);
  try {
    return await postForm(
      API_PATHS.studentDocumentFiles(studentId, documentId),
      form,
      ChecklistSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { file: UPLOAD_FIELDS.file }) ?? error;
  }
}

/**
 * Mark a Document correct, or Rejected with the reason (spec 68). Returns the checklist as it is
 * now. Rejects with `InvalidFieldsError` on `reason` when it is refused.
 */
export async function checkDocument(
  studentId: RecordId,
  documentId: RecordId,
  check: DocumentCheck,
  fetchFn: typeof fetch = fetch,
): Promise<Checklist> {
  try {
    return await postJson(
      API_PATHS.studentDocumentVerification(studentId, documentId),
      check,
      ChecklistSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { reason: "reason" }) ?? error;
  }
}

/** A link to open (or save) one file of a Document, which works for a few minutes (spec 70). */
export async function fetchDocumentLink(
  studentId: RecordId,
  documentId: RecordId,
  fileId: RecordId,
  action: "open" | "download",
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const path = `${API_PATHS.studentDocumentLink(studentId, documentId, fileId)}?action=${action}`;
  const link = await getJson(path, DocumentLinkSchema, fetchFn);
  return link.url;
}

/**
 * One page of the Documents page: Students by how much their paperwork needs (spec 64a);
 * `onlyWaiting` keeps those with a document waiting to be checked (issue 52).
 */
export function fetchPaperwork(
  { scope, page, onlyWaiting }: { scope: PaperworkScope; page: number; onlyWaiting: boolean },
  fetchFn: typeof fetch = fetch,
): Promise<PaperworkPage> {
  const query = new URLSearchParams({ scope, page: String(page) });
  if (onlyWaiting) query.set("waiting", "true");
  return getJson(
    `${API_PATHS.documentsPaperwork}?${query.toString()}`,
    PaperworkPageSchema,
    fetchFn,
  );
}

/** Every Document Type of the office, with where each is used (Configuration). */
export function fetchDocumentTypes(
  fetchFn: typeof fetch = fetch,
): Promise<ConfiguredDocumentType[]> {
  return getJson(API_PATHS.documentTypes, ConfiguredDocumentTypeListSchema, fetchFn);
}

/**
 * Add a Document Type (Configuration → Extra documents). Its usual Document Group is left to the
 * server, which makes it Applying (issue 97). Rejects with `InvalidFieldsError` on `name` when it
 * is refused.
 */
export async function addDocumentType(
  name: string,
  neededByEveryone: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<ConfiguredDocumentType> {
  try {
    return await postJson(
      API_PATHS.documentTypes,
      { name, needed_by_everyone: neededByEveryone },
      ConfiguredDocumentTypeSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { name: "name" }) ?? error;
  }
}

/** Move a Document Type onto, or off, every Student's checklist. */
export function setNeededByEveryone(
  id: RecordId,
  neededByEveryone: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<ConfiguredDocumentType> {
  return patchJson(
    API_PATHS.documentType(id),
    { needed_by_everyone: neededByEveryone },
    ConfiguredDocumentTypeSchema,
    fetchFn,
  );
}

/**
 * Remove a Document Type nothing asks for and with no files (Configuration). A refusal rejects
 * with `ApiRequestError`; `requirementRefusal` reads its reason.
 */
export function removeDocumentType(id: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.documentType(id), fetchFn);
}

/** Every Country's document list, empty ones too (Configuration; issue 80). */
export function fetchCountryLists(fetchFn: typeof fetch = fetch): Promise<CountryList[]> {
  return getJson(API_PATHS.countryLists, CountryListsSchema, fetchFn);
}

/**
 * Make one Country's list exactly these rows (Configuration; issue 80). A refusal rejects with
 * `ApiRequestError`; `requirementRefusal` reads its reason.
 */
export function setCountryList(
  country: Country,
  rows: readonly CountryListRow[],
  fetchFn: typeof fetch = fetch,
): Promise<CountryList> {
  const documents = rows.map((row) => ({ document_type: row.typeId, group: row.group }));
  return putJson(API_PATHS.countryList(country), { documents }, CountryListSchema, fetchFn);
}

/**
 * Make a new Document Type from a Country's list and put it on that list in `group`, in one step
 * (spec 121a; issue 97). Returns the new type and the Country's list as stored. Rejects with
 * `InvalidFieldsError` on `name` when the name is refused (the words say where it already is);
 * any other refusal rejects with `ApiRequestError` (`requirementRefusal` reads it).
 */
export async function addCountryDocument(
  country: Country,
  name: string,
  group: DocumentGroup,
  fetchFn: typeof fetch = fetch,
): Promise<NewCountryDocument> {
  try {
    return await postJson(
      API_PATHS.countryListNewDocument(country),
      { name, group },
      NewCountryDocumentSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { name: "name" }) ?? error;
  }
}

/** Every Document Type, for a document picker (spec 63c). */
export function fetchPickableDocumentTypes(fetchFn: typeof fetch = fetch): Promise<DocumentType[]> {
  return getJson(API_PATHS.pickableDocumentTypes, DocumentTypeListSchema, fetchFn);
}

/**
 * Add a name typed into a document picker as a type asked for only when needed (spec 63c).
 * Rejects with `InvalidFieldsError` on `name` when it is refused.
 */
export async function addPickedDocumentType(
  name: string,
  fetchFn: typeof fetch = fetch,
): Promise<DocumentType> {
  try {
    return await postJson(API_PATHS.pickableDocumentTypes, { name }, DocumentTypeSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, { name: "name" }) ?? error;
  }
}

/** Ask one Student for exactly these extra Document Types (spec 63b); returns the checklist. */
export function setStudentDocuments(
  studentId: RecordId,
  typeIds: readonly RecordId[],
  fetchFn: typeof fetch = fetch,
): Promise<Checklist> {
  return putJson(
    API_PATHS.studentDocumentsAsked(studentId),
    { document_types: typeIds },
    ChecklistSchema,
    fetchFn,
  );
}

/** "Not needed": take a type asked for one Student alone off their checklist. */
export function dropStudentDocument(
  studentId: RecordId,
  typeId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<Checklist> {
  return deleteJson(API_PATHS.studentDocumentAsked(studentId, typeId), ChecklistSchema, fetchFn);
}

const ListRefusalSchema = z.union([
  z
    .object({ document_types: z.array(z.string()).nonempty() })
    .transform(({ document_types }) => document_types),
  z.object({ documents: z.array(z.string()).nonempty() }).transform(({ documents }) => documents),
]);

/**
 * The server's reason for refusing a list of documents or a change to one (400), e.g. "A file is
 * already uploaded for CV, so it stays on the checklist."; null for any other failure.
 */
export function requirementRefusal(error: unknown): string | null {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) return null;
  const detail = DetailAnswerSchema.safeParse(error.body);
  return detail.success ? detail.data.detail : listRefusal(error.body);
}

function listRefusal(body: unknown): string | null {
  const list = ListRefusalSchema.safeParse(body);
  return list.success ? (list.data[0] ?? null) : null;
}

/** Where one Document, or one of its files, is acted on. */
function binTargetPath(studentId: RecordId, target: BinTarget): string {
  const document = API_PATHS.studentDocument(studentId, target.documentId);
  return target.fileId === null ? document : `${document}files/${target.fileId}/`;
}

/**
 * Put a Document, or one of its files, in the Bin with the reason (issue 79; not as an Admin).
 * Returns the checklist as it is now. Rejects with `InvalidFieldsError` on `reason` when refused.
 */
export async function putInBin(
  studentId: RecordId,
  target: BinTarget,
  reason: string,
  fetchFn: typeof fetch = fetch,
): Promise<Checklist> {
  try {
    return await postJson(
      `${binTargetPath(studentId, target)}bin/`,
      { reason },
      ChecklistSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { reason: "reason" }) ?? error;
  }
}

/** Take something I put in the Bin back out. Returns the checklist as it is now. */
export function takeOutOfBin(
  studentId: RecordId,
  target: BinTarget,
  fetchFn: typeof fetch = fetch,
): Promise<Checklist> {
  return postJson(`${binTargetPath(studentId, target)}take-out/`, {}, ChecklistSchema, fetchFn);
}

/** Restore something from the Bin (an Admin). Returns the checklist as it is now. */
export function restoreFromBin(
  studentId: RecordId,
  target: BinTarget,
  fetchFn: typeof fetch = fetch,
): Promise<Checklist> {
  return postJson(`${binTargetPath(studentId, target)}restore/`, {}, ChecklistSchema, fetchFn);
}

/**
 * Delete a Document, or one of its files, for good with its stored files (an Admin): from the
 * Bin, or an Admin's own delete, which skips it. Returns the checklist as it is now.
 */
export function deleteForGood(
  studentId: RecordId,
  target: BinTarget,
  fetchFn: typeof fetch = fetch,
): Promise<Checklist> {
  return deleteJson(binTargetPath(studentId, target), ChecklistSchema, fetchFn);
}

/** One page of the Bin tab (Admins), newest first. */
export function fetchBin(page: number, fetchFn: typeof fetch = fetch): Promise<BinPage> {
  return getJson(`${API_PATHS.documentsBin}?page=${String(page)}`, BinPageSchema, fetchFn);
}

/** A link to open (or save) a file in the Bin, for an Admin on the Bin tab. */
export async function fetchBinFileLink(
  fileId: RecordId,
  action: "open" | "download",
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const path = `${API_PATHS.documentsBinFileLink(fileId)}?action=${action}`;
  const link = await getJson(path, DocumentLinkSchema, fetchFn);
  return link.url;
}
