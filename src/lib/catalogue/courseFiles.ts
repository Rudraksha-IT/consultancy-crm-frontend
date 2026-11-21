import { COURSE_FILE_MAX_BYTES } from "@/constants/catalogue";

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

/** A file's size as Staff read it: "2.4 MB", "800 KB" (always at least "1 KB"). */
export function formatFileSize(bytes: number): string {
  if (bytes >= MEGABYTE) return `${(bytes / MEGABYTE).toFixed(1)} MB`;
  return `${String(Math.max(1, Math.round(bytes / KILOBYTE)))} KB`;
}

/** What is wrong with a file chosen as a Course File before sending it, or null when it fits. */
export function courseFileProblem(file: File): "notPdf" | "tooBig" | null {
  const looksLikePdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) return "notPdf";
  return file.size > COURSE_FILE_MAX_BYTES ? "tooBig" : null;
}

/** A name to start from, taken from the file's own: "deakin-it_2027.pdf" → "Deakin it 2027". */
export function nameFromFile(fileName: string): string {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}
