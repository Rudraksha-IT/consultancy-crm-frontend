import {
  DOCUMENT_TEXT,
  MAX_DOCUMENT_BYTES,
  MAX_FILES_AT_ONCE,
  MAX_UPLOAD_BYTES,
} from "@/constants/documents";

import { documentFileProblem, documentFilesProblem } from "./files";

function fileOf(name: string, size: number): File {
  const file = new File(["x"], name);
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("documentFileProblem", () => {
  it.each(["passport.pdf", "scan.JPG", "photo.jpeg", "card.png"])("accepts %s", (name) => {
    expect(documentFileProblem(fileOf(name, 1000))).toBeNull();
  });

  it("asks for a file when none is chosen", () => {
    expect(documentFileProblem(null)).toBe(DOCUMENT_TEXT.chooseFile);
  });

  it("refuses an empty file", () => {
    expect(documentFileProblem(fileOf("passport.pdf", 0))).toBe(DOCUMENT_TEXT.chooseFile);
  });

  it("accepts exactly 10 MB and refuses more", () => {
    expect(documentFileProblem(fileOf("a.pdf", MAX_DOCUMENT_BYTES))).toBeNull();
    expect(documentFileProblem(fileOf("a.pdf", MAX_DOCUMENT_BYTES + 1))).toBe(
      DOCUMENT_TEXT.fileTooBig,
    );
  });

  it.each(["page.html", "drawing.svg", "notes.txt", "passport", "passport.pdf.exe", "letter.zip"])(
    "refuses %s before sending it",
    (name) => {
      expect(documentFileProblem(fileOf(name, 1000))).toBe(DOCUMENT_TEXT.fileKind);
    },
  );
});

describe("documentFilesProblem (several files for one Document, issue 78)", () => {
  it("accepts a zip on a Student's Document (ticket 09)", () => {
    expect(documentFilesProblem([fileOf("papers.zip", 1000), fileOf("PAPERS.ZIP", 9)])).toBeNull();
  });

  it("names every allowed kind when a file is refused", () => {
    expect(documentFilesProblem([fileOf("notes.txt", 1000)])).toBe(
      "Upload a PDF, JPG, PNG or ZIP file.",
    );
  });

  it("accepts several good files", () => {
    expect(documentFilesProblem([fileOf("front.jpg", 1000), fileOf("back.pdf", 1000)])).toBeNull();
  });

  it("asks for a file when none is chosen", () => {
    expect(documentFilesProblem([])).toBe(DOCUMENT_TEXT.chooseFile);
  });

  it("names the first problem of any one file", () => {
    expect(documentFilesProblem([fileOf("front.jpg", 1000), fileOf("back.html", 1000)])).toBe(
      DOCUMENT_TEXT.studentFileKind,
    );
  });

  it(`accepts ${String(MAX_FILES_AT_ONCE)} files and refuses one more`, () => {
    const most = Array.from({ length: MAX_FILES_AT_ONCE }, (_, n) => fileOf(`${String(n)}.pdf`, 9));
    expect(documentFilesProblem(most)).toBeNull();
    expect(documentFilesProblem([...most, fileOf("one-more.pdf", 9)])).toBe(
      DOCUMENT_TEXT.tooManyAtOnce,
    );
  });

  it("accepts exactly the limit together and refuses more", () => {
    const half = MAX_UPLOAD_BYTES / 2;
    expect(documentFilesProblem([fileOf("a.pdf", half), fileOf("b.pdf", half)])).toBeNull();
    expect(
      documentFilesProblem([fileOf("a.pdf", half), fileOf("b.pdf", half), fileOf("c.pdf", 1)]),
    ).toBe(DOCUMENT_TEXT.tooBigTogether);
  });
});
