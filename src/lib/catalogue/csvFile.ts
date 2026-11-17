/**
 * The most a Catalogue CSV file may weigh. JSON-escaped, its text stays under the Next.js
 * server's request limit (1 MB) and the API's 500,000 characters.
 */
export const CSV_FILE_MAX_BYTES = 400_000;

const CSV_NAME = /\.csv$/i;

export type CsvFileRead =
  | { ok: true; text: string }
  | { ok: false; reason: "missing" | "type" | "tooBig" | "empty" | "unreadable" };

/**
 * The text of the CSV file an Admin chose, checked before anything is sent: a ".csv" name, at
 * most `CSV_FILE_MAX_BYTES`, and not empty. Its rows are checked by the API (spec 49).
 */
export async function readCsvFile(file: File | null): Promise<CsvFileRead> {
  if (file === null) return { ok: false, reason: "missing" };
  const refused = refusedBeforeReading(file);
  if (refused !== null) return refused;
  const text = await fileText(file);
  if (text === null) return { ok: false, reason: "unreadable" };
  return text.trim() === "" ? { ok: false, reason: "empty" } : { ok: true, text };
}

/** What's wrong with the file before its text is read; null when it can be read. */
function refusedBeforeReading(file: File): CsvFileRead | null {
  if (!CSV_NAME.test(file.name)) return { ok: false, reason: "type" };
  if (file.size > CSV_FILE_MAX_BYTES) return { ok: false, reason: "tooBig" };
  return null;
}

/** The file's text as UTF-8; null when the browser couldn't read it. */
function fileText(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve(typeof reader.result === "string" ? reader.result : null);
    });
    reader.addEventListener("error", () => {
      resolve(null);
    });
    reader.readAsText(file);
  });
}
