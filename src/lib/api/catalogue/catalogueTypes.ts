import { z } from "zod";

import { COURSE_LEVELS } from "@/constants/catalogue";
import { COUNTRIES } from "@/constants/students";

import { NamedDocumentTypeSchema } from "../documents/documentsTypes";

import { CourseFileSchema } from "./courseFileTypes";

const INTAKE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** One Course of a University, with its Intakes ("YYYY-MM", always AD), oldest first. */
export const CourseSchema = z
  .object({
    id: z.number().int(),
    university_id: z.number().int(),
    name: z.string(),
    level: z.enum(COURSE_LEVELS),
    intakes: z.array(z.string().regex(INTAKE)),
    archived: z.boolean(),
    /** The extra Document Types it asks for (issue 40). */
    documents: z.array(NamedDocumentTypeSchema),
    /** How many Applications use it; such a Course can't be deleted (issue 92). */
    applications: z.number().int().nonnegative(),
    /** Its Course Files in use, oldest first (ticket 10). */
    files: z.array(CourseFileSchema),
    /** How many Course Files it keeps, counting the Bin: such a Course is never deleted. */
    file_count: z.number().int().nonnegative(),
  })
  .transform(({ university_id, file_count, ...rest }) => ({
    ...rest,
    universityId: university_id,
    fileCount: file_count,
  }));

export type Course = z.infer<typeof CourseSchema>;

/** One University with its Courses. */
export const UniversitySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  country: z.enum(COUNTRIES),
  archived: z.boolean(),
  courses: z.array(CourseSchema),
});

export type University = z.infer<typeof UniversitySchema>;

/** One page of the Catalogue. */
export const UniversityPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(UniversitySchema),
  })
  .transform(({ count, page, page_size, results }) => ({
    count,
    page,
    pageSize: page_size,
    universities: results,
  }));

export type UniversityPage = z.infer<typeof UniversityPageSchema>;

/** What the University dialog sends. */
export type UniversityInput = { name: string; country: string };

/** The University dialog's fields, by their API names. */
export const UNIVERSITY_API_FIELDS = { name: "name", country: "country" } as const;

export type UniversityField = keyof typeof UNIVERSITY_API_FIELDS;

/** What the Add a course dialog sends; `intakes` are "YYYY-MM", `documents` Document Type ids. */
export type CourseInput = {
  name: string;
  level: string;
  intakes: readonly string[];
  documents: readonly number[];
};

/** The Course dialog's fields, by their API names. */
export const COURSE_API_FIELDS = {
  name: "name",
  level: "level",
  intakes: "intakes",
  documents: "documents",
} as const;

export type CourseField = keyof typeof COURSE_API_FIELDS;

/** What a Catalogue CSV import did; `failed` counts rows, problems are in row order. */
export const CatalogueImportResultSchema = z
  .object({
    imported: z.number().int().nonnegative(),
    already_there: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    problems: z.array(z.object({ row: z.number().int().positive(), problem: z.string() })),
  })
  .transform(({ already_there, ...rest }) => ({ ...rest, alreadyThere: already_there }));

export type CatalogueImportResult = z.infer<typeof CatalogueImportResultSchema>;

/** The import's one field, by its API name. */
export const IMPORT_API_FIELDS = { csv: "csv" } as const;
