import clsx from "clsx";

import { Icon } from "@/components/ui/Icon";
import { BATCH_TEXT } from "@/constants/batches";
import type { Batch } from "@/lib/api";

/**
 * A class's time slot, teacher and how many Students it has, each with its icon. In a list on a
 * phone the teacher is dropped (it is on the class's page).
 */
export function BatchMeta({
  batch,
  showsTeacher = true,
  hidesTeacherOnPhone = false,
}: {
  batch: Batch;
  showsTeacher?: boolean;
  hidesTeacherOnPhone?: boolean;
}) {
  return (
    <>
      <span className="inline-flex items-center gap-2">
        <Icon name="clock" size="sm" />
        {batch.timeSlot}
      </span>
      {showsTeacher && (
        <span
          className={clsx(
            "inline-flex items-center gap-2",
            hidesTeacherOnPhone && "max-phone:hidden",
          )}
        >
          <Icon name="badge" size="sm" />
          {batch.teacher.name}
        </span>
      )}
      <span className="inline-flex items-center gap-2">
        <Icon name="users" size="sm" />
        {BATCH_TEXT.studentCount(batch.studentCount)}
      </span>
    </>
  );
}
