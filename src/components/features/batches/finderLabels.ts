import type { StudentFinderLabels } from "@/components/features/tasks/StudentFinder";
import { BATCH_TEXT } from "@/constants/batches";

/** Finding a Student to add to the class that's open. */
export const ADD_LABELS: StudentFinderLabels = {
  search: BATCH_TEXT.findStudent,
  placeholder: BATCH_TEXT.findStudentPlaceholder,
  choice: BATCH_TEXT.studentToAdd,
  none: BATCH_TEXT.chooseStudent,
};

/** Finding a Student to enroll in a class chosen next to it. */
export const ENROLL_LABELS: StudentFinderLabels = { ...ADD_LABELS, choice: BATCH_TEXT.student };
