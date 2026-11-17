import { CSV_FILE_MAX_BYTES, readCsvFile } from "./csvFile";

function csvFile(text: string, name = "catalogue.csv", type = "text/csv"): File {
  return new File([text], name, { type });
}

describe("readCsvFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the text of a CSV file", async () => {
    const text = "university,country,course,level,intakes\nDeakin,Australia,MIT,Master,Feb 2027\n";

    expect(await readCsvFile(csvFile(text))).toEqual({ ok: true, text });
  });

  it.each([
    ["CATALOGUE.CSV", ""],
    ["catalogue.csv", "application/vnd.ms-excel"],
    ["catalogue.csv", ""],
  ])("accepts %s sent as %j", async (name, type) => {
    expect(await readCsvFile(csvFile("a,b\n", name, type))).toEqual({ ok: true, text: "a,b\n" });
  });

  it("needs a file", async () => {
    expect(await readCsvFile(null)).toEqual({ ok: false, reason: "missing" });
  });

  it.each(["catalogue.xlsx", "catalogue.csv.exe", "catalogue"])("refuses %s", async (name) => {
    expect(await readCsvFile(csvFile("a,b\n", name))).toEqual({ ok: false, reason: "type" });
  });

  it("refuses a file over the size limit before reading it", async () => {
    const big = csvFile("x".repeat(CSV_FILE_MAX_BYTES + 1));
    const fine = csvFile("x".repeat(CSV_FILE_MAX_BYTES));

    expect(await readCsvFile(big)).toEqual({ ok: false, reason: "tooBig" });
    expect((await readCsvFile(fine)).ok).toBe(true);
  });

  it.each(["", "  \n\n"])("refuses an empty file (%j)", async (text) => {
    expect(await readCsvFile(csvFile(text))).toEqual({ ok: false, reason: "empty" });
  });

  it("says when the file can't be read", async () => {
    vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(function (this: FileReader) {
      this.dispatchEvent(new ProgressEvent("error"));
    });

    expect(await readCsvFile(csvFile("a,b\n"))).toEqual({ ok: false, reason: "unreadable" });
  });
});
