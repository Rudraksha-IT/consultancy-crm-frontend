import { Suspense } from "react";

import { MyWorkingHoursRoute } from "@/components/features/clock/MyWorkingHoursRoute";

export default function MyWorkingHoursPageRoute() {
  return (
    <Suspense>
      <MyWorkingHoursRoute />
    </Suspense>
  );
}
