import { Suspense } from "react";

import { OfficeGate } from "@/components/features/consultancy/OfficeGate";
import { ForgotPassword } from "@/components/features/auth/ForgotPassword";
import { ForgotPasswordFromAddress } from "@/components/features/auth/ForgotPasswordFromAddress";
import { ConsultancyBrand } from "@/components/features/consultancy/ConsultancyBrand";

export default function ForgotPasswordPage() {
  // It reads `?email=` from the address (issue 66).
  return (
    <OfficeGate>
      <Suspense fallback={<ForgotPassword brand={<ConsultancyBrand />} />}>
        <ForgotPasswordFromAddress brand={<ConsultancyBrand />} />
      </Suspense>
    </OfficeGate>
  );
}
