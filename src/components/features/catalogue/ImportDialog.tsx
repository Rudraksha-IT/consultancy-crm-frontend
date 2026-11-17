"use client";

import { useId, useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FigureTile } from "@/components/ui/FigureTile";
import { FileField } from "@/components/ui/FileField";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { importCatalogue, InvalidFieldsError, type CatalogueImportResult } from "@/lib/api";
import { readCsvFile, type CsvFileRead } from "@/lib/catalogue";

import { SaveDialog } from "../students/profile/SaveDialog";
import { catalogueFailure } from "./catalogueFailure";

type ImportDialogProps = {
  onClose: () => void;
  /** After an import that ran: the list loads again while the result is shown. */
  onImported: () => void;
};

/** Import Universities and Courses from a CSV file, then show what happened (spec 48-49). */
export function ImportDialog({ onClose, onImported }: ImportDialogProps) {
  const [result, setResult] = useState<CatalogueImportResult | null>(null);
  if (result !== null) return <ImportResultDialog result={result} onClose={onClose} />;
  return (
    <ImportFileDialog
      onClose={onClose}
      onImported={(imported) => {
        setResult(imported);
        onImported();
      }}
    />
  );
}

type ImportFileDialogProps = {
  onClose: () => void;
  onImported: (result: CatalogueImportResult) => void;
};

function ImportFileDialog({ onClose, onImported }: ImportFileDialogProps) {
  const formId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function runImport(): Promise<void> {
    const read = await readCsvFile(file);
    if (!read.ok) {
      setFileError(FILE_PROBLEMS[read.reason]);
      return;
    }
    setIsImporting(true);
    try {
      onImported(await importCatalogue(read.text));
    } catch (error) {
      showRefusal(error);
      setIsImporting(false);
    }
  }

  /** A file refused as a whole is shown under the field; anything else under the form. */
  function showRefusal(error: unknown): void {
    const refused = error instanceof InvalidFieldsError ? error.fieldErrors.csv?.[0] : undefined;
    if (refused === undefined) setFailure(importFailure(error));
    else setFileError(refused);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (isImporting) return;
    setFileError(null);
    setFailure(null);
    void runImport();
  }

  return (
    <SaveDialog
      title={CATALOGUE_TEXT.importTitle}
      formId={formId}
      saveLabel={CATALOGUE_TEXT.importSave}
      saveIcon="upload"
      isSaving={isImporting}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid gap-2">
          <p>{CATALOGUE_TEXT.importIntro}</p>
          <pre
            tabIndex={0}
            aria-label={CATALOGUE_TEXT.importSampleLabel}
            className="bg-fill-2 rounded-control text-small overflow-x-auto p-3"
          >
            {CATALOGUE_TEXT.importSample}
          </pre>
          <p className="text-small text-ink-2">{CATALOGUE_TEXT.importFormatHint}</p>
        </div>
        <FileField
          label={CATALOGUE_TEXT.importFile}
          name="file"
          accept=".csv,text/csv"
          hint={CATALOGUE_TEXT.importMatched}
          errors={fileError === null ? undefined : [fileError]}
          onChange={(chosen) => {
            setFile(chosen);
            setFileError(null);
          }}
        />
      </form>
    </SaveDialog>
  );
}

type FileProblem = Extract<CsvFileRead, { ok: false }>["reason"];

/** Why the chosen file wasn't sent. */
const FILE_PROBLEMS: Record<FileProblem, string> = {
  missing: CATALOGUE_TEXT.importNoFile,
  type: CATALOGUE_TEXT.importNotCsv,
  tooBig: CATALOGUE_TEXT.importTooBig,
  empty: CATALOGUE_TEXT.importEmpty,
  unreadable: CATALOGUE_TEXT.importUnreadable,
};

/** Not an Admin (403), or anything else. */
function importFailure(error: unknown): string {
  const said = catalogueFailure(error);
  return said === CATALOGUE_TEXT.notAdmin ? said : CATALOGUE_TEXT.importFailed;
}

type ImportResultDialogProps = { result: CatalogueImportResult; onClose: () => void };

function ImportResultDialog({ result, onClose }: ImportResultDialogProps) {
  return (
    <Dialog
      isOpen
      title={CATALOGUE_TEXT.importFinished}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          {CATALOGUE_TEXT.done}
        </Button>
      }
    >
      <div className="phone:grid-cols-3 grid gap-4">
        <FigureTile
          label={CATALOGUE_TEXT.imported}
          value={<span className="text-good">{result.imported}</span>}
        />
        <FigureTile label={CATALOGUE_TEXT.alreadyThere} value={result.alreadyThere} />
        <FigureTile
          label={CATALOGUE_TEXT.failed}
          value={
            <span className={result.failed > 0 ? "text-bad" : undefined}>{result.failed}</span>
          }
        />
      </div>
      {result.problems.length > 0 && <ProblemTable problems={result.problems} />}
      {result.failed > 0 ? (
        <Banner tone="warning">{CATALOGUE_TEXT.fixRows}</Banner>
      ) : (
        <Banner tone="info" icon="check">
          {CATALOGUE_TEXT.noFailures}
        </Banner>
      )}
    </Dialog>
  );
}

function ProblemTable({ problems }: { problems: CatalogueImportResult["problems"] }) {
  return (
    <div className="border-rule rounded-control overflow-hidden border">
      <table aria-label={CATALOGUE_TEXT.failedRows} className="text-body w-full border-collapse">
        <thead className="bg-fill text-small text-ink-2">
          <tr>
            <th scope="col" className="w-16 px-4 py-3 text-left">
              {CATALOGUE_TEXT.row}
            </th>
            <th scope="col" className="px-4 py-3 text-left">
              {CATALOGUE_TEXT.problem}
            </th>
          </tr>
        </thead>
        <tbody className="divide-rule divide-y">
          {problems.map(({ row, problem }, index) => (
            <tr key={`${String(row)}-${String(index)}`}>
              <td className="px-4 py-3 align-top tabular-nums">{row}</td>
              <td className="px-4 py-3 break-words">{problem}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
