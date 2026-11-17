import { z } from "zod";

import { API_PATHS } from "@/constants/api";
import { EXPORT_LISTS, type ExportList } from "@/constants/exports";
import type { ExportFilters } from "@/lib/exports";

import { getJson, postJsonForBlob } from "../core/client";

const ExportRecordSchema = z
  .object({
    id: z.number().int(),
    list: z.enum(EXPORT_LISTS),
    filters: z.string(),
    row_count: z.number().int().nonnegative(),
    by: z.string(),
    at: z.iso.datetime({ offset: true }),
  })
  .transform((record) => ({
    id: record.id,
    list: record.list,
    filters: record.filters,
    rowCount: record.row_count,
    by: record.by,
    at: record.at,
  }));

const ExportRecordPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(ExportRecordSchema),
  })
  .transform((page) => ({
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    records: page.results,
  }));

/** One CSV export: which list, its filters in words, how many rows, who and when (spec 31c). */
export type ExportRecord = z.infer<typeof ExportRecordSchema>;
export type ExportRecordPage = z.infer<typeof ExportRecordPageSchema>;

/**
 * Download a whole filtered list as a CSV file (spec 31b). Admins only; the server records the
 * export. A POST, so the Next.js server checks it comes from this page's own origin.
 */
export function downloadExport(
  list: ExportList,
  filters: ExportFilters,
  fetchFn: typeof fetch = fetch,
): Promise<Blob> {
  return postJsonForBlob(API_PATHS.exports, { list, filters }, fetchFn);
}

/** One page of the office's Export Records, newest first (Configuration → Exports). */
export function fetchExportRecords(
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<ExportRecordPage> {
  const query = page > 1 ? `?page=${String(page)}` : "";
  return getJson(`${API_PATHS.exports}${query}`, ExportRecordPageSchema, fetchFn);
}
