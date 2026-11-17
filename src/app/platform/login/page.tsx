import { Suspense } from "react";

import { AuthLayout } from "@/components/features/auth/AuthLayout";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { PlatformBrand } from "@/components/features/platform/PlatformBrand";
import { PlatformLoginForm } from "@/components/features/platform/PlatformLoginForm";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";

export default function PlatformLoginPage() {
  return (
    <AuthLayout brand={<PlatformBrand />} title={LABELS.logIn} intro={MESSAGES.platformLogInIntro}>
      {/* It reads `?password=changed` from the address (issue 63). */}
      <Suspense fallback={<LoginForm forgotPasswordPath={ROUTES.platformForgotPassword} />}>
        <PlatformLoginForm />
      </Suspense>
    </AuthLayout>
  );
}
