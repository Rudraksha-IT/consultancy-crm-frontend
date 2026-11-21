import { describe, expect, it } from "vitest";

import { courseFileProblem, formatFileSize, nameFromFile } from "./courseFiles";

function file(name: string, size: number, type = "application/pdf"): File {
  const made = new File(["x"], name, { type });
  Object.defineProperty(made, "size", { value: size });
  return made;
}

describe("formatFileSize", () => {
  it.each([
    [0, "1 KB"],
    [800 * 1024, "800 KB"],
    [2.4 * 1024 * 1024, "2.4 MB"],
    [5 * 1024 * 1024, "5.0 MB"],
  ])("writes %d bytes as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe("courseFileProblem", () => {
  it("accepts a PDF of at most 5 MB", () => {
    expect(courseFileProblem(file("a.pdf", 5 * 1024 * 1024))).toBeNull();
    expect(courseFileProblem(file("A.PDF", 10, ""))).toBeNull();
  });

  it("refuses anything that isn't a PDF, and anything bigger", () => {
    expect(courseFileProblem(file("photo.png", 10, "image/png"))).toBe("notPdf");
    expect(courseFileProblem(file("a.pdf", 5 * 1024 * 1024 + 1))).toBe("tooBig");
  });
});

describe("nameFromFile", () => {
  it("starts from the file's own name, tidied", () => {
    expect(nameFromFile("deakin-master_it--2027.pdf")).toBe("Deakin master it 2027");
    expect(nameFromFile("brochure")).toBe("Brochure");
    expect(nameFromFile(".pdf")).toBe("");
  });
});
