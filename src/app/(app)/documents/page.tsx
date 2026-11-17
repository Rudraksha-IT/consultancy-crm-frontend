import { Suspense } from "react";

import { DocumentsRoute } from "@/components/features/documents/DocumentsRoute";

export default function DocumentsPageRoute() {
  return (
    <Suspense>
      <DocumentsRoute />
    </Suspense>
  );
}
