import { Suspense } from "react";

import { Join } from "@/components/features/auth/Join";
import { JoinFromAddress } from "@/components/features/auth/JoinFromAddress";
import { PlatformBrand } from "@/components/features/platform/PlatformBrand";

/** Joining the Platform with an emailed Code (issue 65): the same steps as for Staff. */
export default function PlatformJoinPage() {
  return (
    <Suspense fallback={<Join brand={<PlatformBrand />} side="platform" />}>
      <JoinFromAddress brand={<PlatformBrand />} side="platform" />
    </Suspense>
  );
}
