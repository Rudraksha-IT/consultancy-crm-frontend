import { Suspense } from "react";

import { OfficeGate } from "@/components/features/consultancy/OfficeGate";
import { Join } from "@/components/features/auth/Join";
import { JoinFromAddress } from "@/components/features/auth/JoinFromAddress";
import { ConsultancyBrand } from "@/components/features/consultancy/ConsultancyBrand";

export default function JoinPage() {
  // It reads `?email=` and `?sent=` from the address (issue 66).
  return (
    <OfficeGate>
      <Suspense fallback={<Join brand={<ConsultancyBrand />} />}>
        <JoinFromAddress brand={<ConsultancyBrand />} />
      </Suspense>
    </OfficeGate>
  );
}
