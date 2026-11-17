"use client";

import { useSearchParams } from "next/navigation";

import { EmployeesPage } from "./EmployeesPage";

/** Employees, opened on the Working hours tab when the address asks for it (`?tab=hours`). */
export function EmployeesRoute() {
  const tab = useSearchParams().get("tab") === "hours" ? "hours" : "people";
  return <EmployeesPage key={tab} initialTab={tab} />;
}
