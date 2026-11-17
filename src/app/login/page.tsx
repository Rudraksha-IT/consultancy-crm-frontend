import { Suspense } from "react";

import { OfficeGate } from "@/components/features/consultancy/OfficeGate";
import { AuthLayout } from "@/components/features/auth/AuthLayout";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { OfficeLoginForm } from "@/components/features/auth/OfficeLoginForm";
import { ConsultancyBrand } from "@/components/features/consultancy/ConsultancyBrand";
import { LABELS, MESSAGES } from "@/constants/messages";

export default function LoginPage() {
  return (
    <OfficeGate>
      <AuthLayout brand={<ConsultancyBrand />} title={LABELS.logIn} intro={MESSAGES.logInIntro}>
        <Suspense fallback={<LoginForm />}>
          <OfficeLoginForm />
        </Suspense>
      </AuthLayout>
    </OfficeGate>
  );
}
