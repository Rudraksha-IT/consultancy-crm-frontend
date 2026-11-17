"use client";

import { useEffect, useState } from "react";

import { fetchEmployees, type Employee } from "@/lib/api";

export type EmployeeListState =
  { status: "loading" } | { status: "loaded"; employees: Employee[] } | { status: "failed" };

export type EmployeesState = {
  list: EmployeeListState;
  /** Show someone just added, at the end of the list. */
  add: (employee: Employee) => void;
  /** Show an employee as the API returned them after a change. */
  replace: (employee: Employee) => void;
  /** Stop showing someone whose invite was cancelled. */
  remove: (id: number) => void;
};

/** Load the office's employees and keep the list in step with changes made on the page. */
export function useEmployees(): EmployeesState {
  const [list, setList] = useState<EmployeeListState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const employees = await fetchEmployees();
        if (!isCancelled) setList({ status: "loaded", employees });
      } catch {
        if (!isCancelled) setList({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  function update(change: (employees: Employee[]) => Employee[]): void {
    setList((current) =>
      current.status === "loaded"
        ? { status: "loaded", employees: change(current.employees) }
        : current,
    );
  }

  return {
    list,
    add: (employee) => {
      update((employees) => [...employees, employee]);
    },
    replace: (employee) => {
      update((employees) => employees.map((item) => (item.id === employee.id ? employee : item)));
    },
    remove: (id) => {
      update((employees) => employees.filter((item) => item.id !== id));
    },
  };
}
