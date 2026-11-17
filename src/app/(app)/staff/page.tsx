import { Suspense } from "react";

import { EmployeesRoute } from "@/components/features/staff/EmployeesRoute";

export default function EmployeesPageRoute() {
  return (
    <Suspense>
      <EmployeesRoute />
    </Suspense>
  );
}
