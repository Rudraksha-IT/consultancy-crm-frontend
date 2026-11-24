import { describeFilters, exportFileName, exportFilters } from ".";

describe("exportFilters", () => {
  it("is empty for everyone", () => {
    expect(exportFilters("")).toEqual({});
  });

  it("keeps every filter of the list's query but the page", () => {
    expect(exportFilters("?q=Sita%20K&stage=lead&counsellor=me&page=3")).toEqual({
      q: "Sita K",
      stage: "lead",
      counsellor: "me",
    });
  });

  it("sends a Status as a list, as the API takes several", () => {
    expect(exportFilters("?status=offer&sort=intake")).toEqual({
      status: ["offer"],
      sort: "intake",
    });
  });

  it("decodes what was typed", () => {
    expect(exportFilters("?q=a%26b%3Dc")).toEqual({ q: "a&b=c" });
  });
});

describe("exportFileName", () => {
  it("names the list and the day", () => {
    expect(exportFileName("visas", "2026-11-05")).toBe("visas-2026-11-05.csv");
  });
});

describe("describeFilters", () => {
  it("names only the filters that are set", () => {
    expect(
      describeFilters(
        [
          ["Search", " "],
          ["Stage", "Applying"],
          ["Counsellor", "Hari Thapa"],
        ],
        "Everyone",
      ),
    ).toBe("Stage: Applying, Counsellor: Hari Thapa");
  });

  it("says when nothing narrows the list", () => {
    expect(describeFilters([["Stage", ""]], "Everyone")).toBe("Everyone");
  });
});
