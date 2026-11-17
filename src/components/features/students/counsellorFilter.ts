import type { SelectOption } from "@/components/ui/SelectField";
import { Role } from "@/constants/roles";
import { CounsellorFilter } from "@/constants/students";
import type { CounsellorChoice } from "@/lib/api";

export type CounsellorFilterLabels = {
  /** The first choice, which also names the filter. */
  any: string;
  /** The choice for the person's own Students ("Assigned to me", "My Students"). */
  me: string;
  /** The choice for Students with no Assigned Counsellor, where the list offers it. */
  none?: string;
};

/** Admins and Counsellors can be Assigned Counsellors, so "my Students" means something. */
export function canBeAssignedStudents(role: Role): boolean {
  return role === Role.Admin || role === Role.Counsellor;
}

/**
 * The Assigned Counsellor filter's choices, the same on Students, Applications and Visas: Any,
 * the person's own (if they can be assigned), No counsellor yet (where offered), then every
 * Counsellor, whatever the person's Role (spec 136).
 */
export function counsellorFilterOptions(
  counsellors: readonly CounsellorChoice[],
  canBeAssigned: boolean,
  labels: CounsellorFilterLabels,
): SelectOption[] {
  return [
    { value: CounsellorFilter.Any, label: labels.any },
    ...(canBeAssigned ? [{ value: CounsellorFilter.Me, label: labels.me }] : []),
    ...(labels.none === undefined ? [] : [{ value: CounsellorFilter.None, label: labels.none }]),
    ...counsellors.map(({ id, name }) => ({ value: String(id), label: name })),
  ];
}
