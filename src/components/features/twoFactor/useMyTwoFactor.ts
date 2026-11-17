"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchMyTwoFactor, type TwoFactorSide, type TwoFactorState } from "@/lib/api";

export type MyTwoFactor =
  { kind: "loading" } | { kind: "failed" } | { kind: "loaded"; state: TwoFactorState };

/**
 * My two-step login (issue 61; Staff in 62), loaded once; `set` keeps the state a change
 * answered with.
 */
export function useMyTwoFactor(side: TwoFactorSide = "platform"): {
  twoFactor: MyTwoFactor;
  set: (state: TwoFactorState) => void;
} {
  const [twoFactor, setTwoFactor] = useState<MyTwoFactor>({ kind: "loading" });

  useEffect(() => {
    let isCurrent = true;
    fetchMyTwoFactor(fetch, side).then(
      (state) => {
        if (isCurrent) setTwoFactor({ kind: "loaded", state });
      },
      () => {
        if (isCurrent) setTwoFactor({ kind: "failed" });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [side]);

  const set = useCallback((state: TwoFactorState) => {
    setTwoFactor({ kind: "loaded", state });
  }, []);

  return { twoFactor, set };
}
