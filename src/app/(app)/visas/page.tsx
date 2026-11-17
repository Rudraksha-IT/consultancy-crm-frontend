import { Suspense } from "react";

import { VisasRoute } from "@/components/features/visas/VisasRoute";

/** Every Visa in the office (issue 48). */
export default function VisasPageRoute() {
  return (
    <Suspense>
      <VisasRoute />
    </Suspense>
  );
}
