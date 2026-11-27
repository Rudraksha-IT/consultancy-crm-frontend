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

/**
 * Narrower than the board needs: its five columns of 224 with their gaps, the sheet's padding,
 * the page's margins and the side menu come to 1370. Below that the board would scroll sideways,
 * so Students are shown as the List only (owner, 2026-11-27).
 */
export const BOARD_TOO_NARROW_QUERY = "(width < 85.625rem)";
