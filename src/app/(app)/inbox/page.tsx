import { Suspense } from "react";

import { InboxRoute } from "@/components/features/inbox/InboxRoute";

export default function InboxPageRoute() {
  return (
    <Suspense>
      <InboxRoute />
    </Suspense>
  );
}
