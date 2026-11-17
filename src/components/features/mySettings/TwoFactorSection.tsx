"use client";

import { SecuritySection } from "@/components/features/twoFactor/SecuritySection";
import { useMyTwoFactor } from "@/components/features/twoFactor/useMyTwoFactor";

/**
 * My own two-step login (issue 62): switch it on and set up the app, make new recovery codes,
 * and switch it off when I may (an Admin, or someone who switched it on themselves).
 */
export function TwoFactorSection() {
  const { twoFactor, set } = useMyTwoFactor("staff");
  return <SecuritySection side="staff" twoFactor={twoFactor} onChanged={set} />;
}
