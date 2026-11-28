import type { StudentFinderLabels } from "@/components/features/tasks/StudentFinder";
import { BATCH_TEXT } from "@/constants/batches";

/** Finding a Student to enroll in a class chosen next to it. */
export const ENROLL_LABELS: StudentFinderLabels = {
  search: BATCH_TEXT.findStudent,
  placeholder: BATCH_TEXT.findStudentPlaceholder,
  choice: BATCH_TEXT.student,
  none: BATCH_TEXT.chooseStudent,
};
