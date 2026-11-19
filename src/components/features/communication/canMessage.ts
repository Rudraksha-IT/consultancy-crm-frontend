import { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import type { StaffContext } from "@/lib/api";

/** Whether this person can email Students: the Module is on and they aren't a Teacher. */
export function canMessageStudents({ staff, modules }: StaffContext): boolean {
  return modules.includes(Module.Communication) && staff.role !== Role.Teacher;
}
