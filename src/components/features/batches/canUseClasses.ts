import { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import type { StaffContext } from "@/lib/api";

/** Whether the Staff member sees classes at all: the Module is on and their Role uses them. */
export function canSeeClasses({ staff, modules }: StaffContext): boolean {
  return modules.includes(Module.Batches) && staff.role !== Role.FrontDesk;
}

/** Whether they create and fill classes: Admins and Counsellors (spec 83-84). */
export function canManageClasses(context: StaffContext): boolean {
  const { role } = context.staff;
  return canSeeClasses(context) && (role === Role.Admin || role === Role.Counsellor);
}
