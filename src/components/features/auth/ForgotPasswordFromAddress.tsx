"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import type { TwoFactorSide } from "@/lib/api";
import { emailFromAddress } from "@/lib/centralLogin";

import { ForgotPassword } from "./ForgotPassword";

type ForgotPasswordFromAddressProps = { brand: ReactNode; side?: TwoFactorSide };

/** Forgot password as the login's password step opens it (issue 66): with a checked `?email=`. */
export function ForgotPasswordFromAddress({
  brand,
  side = "staff",
}: ForgotPasswordFromAddressProps) {
  const params = useSearchParams();
  return (
    <ForgotPassword brand={brand} side={side} knownEmail={emailFromAddress(params.get("email"))} />
  );
}
