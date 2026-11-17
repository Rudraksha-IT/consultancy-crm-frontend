import {
  DOCUMENT_FILE_EXTENSIONS,
  DOCUMENT_TEXT,
  MAX_DOCUMENT_BYTES,
  MAX_FILES_AT_ONCE,
  MAX_UPLOAD_BYTES,
} from "@/constants/documents";

/**
 * Why a chosen file can't be uploaded, or null when it may be sent. A quick check by name and
 * size only, to save a wasted upload; the server decides from the file's own bytes.
 */
export function documentFileProblem(file: File | null): string | null {
  if (file === null || file.size === 0) return DOCUMENT_TEXT.chooseFile;
  if (file.size > MAX_DOCUMENT_BYTES) return DOCUMENT_TEXT.fileTooBig;
  const name = file.name.toLowerCase();
  const isKnown = DOCUMENT_FILE_EXTENSIONS.some((extension) => name.endsWith(extension));
  return isKnown ? null : DOCUMENT_TEXT.fileKind;
}

/**
 * Why the files chosen for one Document can't be uploaded together, or null when they may be
 * sent (issue 78): none chosen, too many, one of them refused, or too big together. A quick
 * check only; the server decides.
 */
export function documentFilesProblem(files: readonly File[]): string | null {
  if (files.length === 0) return DOCUMENT_TEXT.chooseFile;
  if (files.length > MAX_FILES_AT_ONCE) return DOCUMENT_TEXT.tooManyAtOnce;
  const problem = files.map(documentFileProblem).find((one) => one !== null);
  if (problem !== undefined) return problem;
  const total = files.reduce((sum, file) => sum + file.size, 0);
  return total > MAX_UPLOAD_BYTES ? DOCUMENT_TEXT.tooBigTogether : null;
}
