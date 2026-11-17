import { ContactKind } from "@/constants/exports";

import { contactsToCopy, describeFilters, exportFileName, exportFilters } from ".";

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

describe("contactsToCopy", () => {
  const rows = [
    { studentId: 1, email: "sita@example.com", phone: "9841000001" },
    { studentId: 2, email: "", phone: " 9841000002 " },
    { studentId: 1, email: "sita@example.com", phone: "9841000001" },
    { studentId: 3, email: "SITA@example.com ", phone: "9841000001" },
  ];

  it("joins emails with a comma, leaving out empty ones and counting who has none", () => {
    expect(contactsToCopy(rows, ContactKind.Email)).toEqual({
      text: "sita@example.com, SITA@example.com",
      count: 2,
      missing: 1,
    });
  });

  it("puts phones one per line, each once", () => {
    expect(contactsToCopy(rows, ContactKind.Phone)).toEqual({
      text: "9841000001\n9841000002",
      count: 2,
      missing: 0,
    });
  });

  it("copies nothing when nobody has one", () => {
    expect(contactsToCopy(rows.slice(1, 2), ContactKind.Email)).toEqual({
      text: "",
      count: 0,
      missing: 1,
    });
  });
});
