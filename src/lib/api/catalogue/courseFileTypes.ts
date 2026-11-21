import { z } from "zod";

import { RecordIdSchema } from "@/lib/recordId";

/** A PDF brochure kept on a Course (ticket 10): its shown name, its own file name and size. */
export const CourseFileSchema = z
  .object({
    id: RecordIdSchema,
    name: z.string(),
    file_name: z.string(),
    size: z.number().int().nonnegative(),
    uploaded_at: z.iso.datetime({ offset: true }),
  })
  .transform(({ file_name, uploaded_at, ...rest }) => ({
    ...rest,
    fileName: file_name,
    uploadedAt: uploaded_at,
  }));

export type CourseFile = z.infer<typeof CourseFileSchema>;

/** A Course File as it shows in the Bin tab: its name and its University and Course. */
export const BinnedCourseFileSchema = z
  .object({
    kind: z.literal("course_file"),
    course_file: z.object({ id: RecordIdSchema, name: z.string(), file_name: z.string() }),
    university: z.object({ id: RecordIdSchema, name: z.string() }),
    course: z.object({ id: RecordIdSchema, name: z.string() }),
    by: z.object({ id: RecordIdSchema.nullable(), name: z.string() }),
    at: z.iso.datetime({ offset: true }),
    reason: z.string(),
  })
  .transform(({ kind, course_file, university, course, by, at, reason }) => ({
    kind,
    courseFile: { id: course_file.id, name: course_file.name, fileName: course_file.file_name },
    university,
    course,
    bin: { by, at, reason },
  }));

export type BinnedCourseFile = z.infer<typeof BinnedCourseFileSchema>;
