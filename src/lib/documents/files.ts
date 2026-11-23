import {
  DOCUMENT_FILE_EXTENSIONS,
  DOCUMENT_TEXT,
  MAX_DOCUMENT_BYTES,
  MAX_FILES_AT_ONCE,
  MAX_UPLOAD_BYTES,
  STUDENT_DOCUMENT_FILE_EXTENSIONS,
  ZIP_EXTENSION,
} from "@/constants/documents";

type Kinds = { extensions: readonly string[]; message: string };

const LETTER_KINDS: Kinds = {
  extensions: DOCUMENT_FILE_EXTENSIONS,
  message: DOCUMENT_TEXT.fileKind,
};
const STUDENT_DOCUMENT_KINDS: Kinds = {
  extensions: STUDENT_DOCUMENT_FILE_EXTENSIONS,
  message: DOCUMENT_TEXT.studentFileKind,
};

/** True for a zip, which is only ever downloaded, never opened in the browser (ticket 09). */
export function isZipFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(ZIP_EXTENSION);
}

/**
 * Why a chosen file can't be uploaded, or null when it may be sent. A quick check by name and
 * size only, to save a wasted upload; the server decides from the file's own bytes.
 */
export function documentFileProblem(file: File | null): string | null {
  return fileProblem(file, LETTER_KINDS);
}

function fileProblem(file: File | null, kinds: Kinds): string | null {
  if (file === null || file.size === 0) return DOCUMENT_TEXT.chooseFile;
  if (file.size > MAX_DOCUMENT_BYTES) return DOCUMENT_TEXT.fileTooBig;
  const name = file.name.toLowerCase();
  const isKnown = kinds.extensions.some((extension) => name.endsWith(extension));
  return isKnown ? null : kinds.message;
}

/**
 * Why the files chosen for one Document can't be uploaded together, or null when they may be
 * sent (issue 78): none chosen, too many, one of them refused, or too big together. Zips are
 * allowed here (ticket 09), unlike on Offer Letters and visa letters. A quick check only; the
 * server decides.
 */
export function documentFilesProblem(files: readonly File[]): string | null {
  if (files.length === 0) return DOCUMENT_TEXT.chooseFile;
  if (files.length > MAX_FILES_AT_ONCE) return DOCUMENT_TEXT.tooManyAtOnce;
  const problem = files
    .map((file) => fileProblem(file, STUDENT_DOCUMENT_KINDS))
    .find((one) => one !== null);
  if (problem !== undefined) return problem;
  const total = files.reduce((sum, file) => sum + file.size, 0);
  return total > MAX_UPLOAD_BYTES ? DOCUMENT_TEXT.tooBigTogether : null;
}
