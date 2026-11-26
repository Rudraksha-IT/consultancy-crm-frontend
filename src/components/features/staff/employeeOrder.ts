import { StaffStatus, type Employee } from "@/lib/api";

/** Where each status sits on Employees: working here, then invited, then those who have left. */
const GROUP: Record<StaffStatus, number> = {
  [StaffStatus.Active]: 0,
  [StaffStatus.Invited]: 1,
  [StaffStatus.Deactivated]: 2,
};

/**
 * The Employees list in the order it is shown (ticket 18): people working here A to Z, then the
 * invited, then those who have left at the bottom. Returns a new list.
 */
export function inEmployeesOrder(employees: readonly Employee[]): Employee[] {
  return [...employees].sort(
    (a, b) =>
      GROUP[a.status] - GROUP[b.status] ||
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}
