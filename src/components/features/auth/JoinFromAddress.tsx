"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import type { TwoFactorSide } from "@/lib/api";
import { emailFromAddress } from "@/lib/centralLogin";

import { Join } from "./Join";

type JoinFromAddressProps = { brand: ReactNode; side?: TwoFactorSide };

/**
 * The Join page as the login sends people to it (issue 66): `?email=` (checked like any typed
 * email; anything else is ignored) and `?sent=1` when the login just emailed a new code.
 */
export function JoinFromAddress({ brand, side = "staff" }: JoinFromAddressProps) {
  const params = useSearchParams();
  const knownEmail = emailFromAddress(params.get("email"));
  return (
    <Join
      brand={brand}
      side={side}
      knownEmail={knownEmail}
      codeSent={knownEmail !== "" && params.get("sent") === "1"}
    />
  );
}
