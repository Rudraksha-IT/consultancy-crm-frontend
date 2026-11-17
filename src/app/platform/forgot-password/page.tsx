import { Suspense } from "react";

import { ForgotPassword } from "@/components/features/auth/ForgotPassword";
import { ForgotPasswordFromAddress } from "@/components/features/auth/ForgotPasswordFromAddress";
import { PlatformBrand } from "@/components/features/platform/PlatformBrand";

/** Forgot password on the Platform address (issue 63): the same steps as for Staff. */
export default function PlatformForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPassword brand={<PlatformBrand />} side="platform" />}>
      <ForgotPasswordFromAddress brand={<PlatformBrand />} side="platform" />
    </Suspense>
  );
}
