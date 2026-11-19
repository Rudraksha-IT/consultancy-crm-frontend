import { ApiRequestError } from "../core/errors";
import { downloadExport, fetchExportRecords } from "./exports";
import { jsonResponse } from "../core/test-helpers";

const RECORD = {
  id: 4,
  list: "students",
  filters: "Stage: Applying",
  row_count: 12,
  by: "Ramesh (Platform Admin)",
  at: "2026-11-05T09:12:33.123456+00:00",
};

describe("downloadExport", () => {
  it("POSTs the list and its filters as JSON and gives back the file", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("﻿Name\r\n", { headers: { "Content-Type": "text/csv" } }));

    const file = await downloadExport("applications", { status: ["offer"] }, fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/exports/",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ list: "applications", filters: { status: ["offer"] } }),
      }),
    );
    expect(await file.text()).toContain("Name");
  });

  it("fails with the server's answer when refused", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ detail: "Only an Admin can export lists." }, 403));

    await expect(downloadExport("students", {}, fetchFn)).rejects.toMatchObject({
      status: 403,
      body: { detail: "Only an Admin can export lists." },
    });
  });
});

describe("fetchExportRecords", () => {
  it("reads a page of records in frontend terms", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ count: 1, page: 2, page_size: 25, results: [RECORD] }));

    const page = await fetchExportRecords(2, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/exports/?page=2");
    expect(page).toEqual({
      count: 1,
      page: 2,
      pageSize: 25,
      records: [
        {
          id: 4,
          list: "students",
          filters: "Stage: Applying",
          rowCount: 12,
          by: "Ramesh (Platform Admin)",
          at: RECORD.at,
        },
      ],
    });
  });

  it("asks for the first page without a page number", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ count: 0, page: 1, page_size: 25, results: [] }));

    await fetchExportRecords(1, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/exports/");
  });

  it.each([
    { ...RECORD, list: "fees" },
    { ...RECORD, row_count: -1 },
    { ...RECORD, at: "yesterday" },
    { ...RECORD, filters: 3 },
  ])("refuses an answer that isn't a record: %o", async (record) => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ count: 1, page: 1, page_size: 25, results: [record] }));

    await expect(fetchExportRecords(1, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
