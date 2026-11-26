import { z } from "zod";

import { StudentsView } from "@/constants/students";

const StudentsViewSchema = z.enum(StudentsView);

/**
 * How Students are shown, from what the device remembers. Anything that is not a view (nothing
 * stored yet, or something else written there) gives the Board.
 */
export function studentsViewFrom(stored: string | null): StudentsView {
  const parsed = StudentsViewSchema.safeParse(stored);
  return parsed.success ? parsed.data : StudentsView.Board;
}
