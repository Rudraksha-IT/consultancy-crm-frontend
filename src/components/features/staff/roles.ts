import type { SelectOption } from "@/components/ui/SelectField";
import { Module } from "@/constants/modules";
import { ROLE_LABELS, ROLES, Role } from "@/constants/roles";

/**
 * The Roles an Admin can give: Teacher only while test-prep classes are on, unless the person
 * already is one (`current`), so their Role stays selectable.
 */
export function roleOptions(modules: readonly Module[], current?: Role): SelectOption[] {
  const hasClasses = modules.includes(Module.Batches);
  return ROLES.filter((role) => role !== Role.Teacher || hasClasses || role === current).map(
    (role) => ({ value: role, label: ROLE_LABELS[role] }),
  );
}

/** Narrow a select's value to a Role. */
export function isRole(value: string): value is Role {
  return ROLES.some((role) => role === value);
}
