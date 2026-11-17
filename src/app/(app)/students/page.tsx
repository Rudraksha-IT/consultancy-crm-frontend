import { Suspense } from "react";

import { StudentsRoute } from "@/components/features/students/StudentsRoute";

export default function StudentsPageRoute() {
  return (
    <Suspense>
      <StudentsRoute />
    </Suspense>
  );
}
