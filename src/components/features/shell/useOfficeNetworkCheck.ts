"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { OFFICE_NETWORK_CHECK_MS } from "@/constants/officeNetworks";
import { fetchCurrentNetwork } from "@/lib/api";
import { isNotNow, rememberNotNow } from "@/lib/officeNetworkNotNow";

export type OfficeNetworkCheck = {
  /** The network to offer (the server's suggestion), or null when there is nothing to ask. */
  asking: string | null;
  /** Not now: never ask about this network on this device again. */
  notNow: () => void;
  /** It was added: stop asking. */
  added: () => void;
};

function isShown(): boolean {
  return document.visibilityState !== "hidden";
}

/** The server's suggestion when it isn't saved and Not now wasn't pressed for it, else null. */
async function networkToAsk(notNowThisVisit: ReadonlySet<string>): Promise<string | null> {
  const here = await fetchCurrentNetwork();
  const network = here.isCovered ? null : here.suggestedNetwork;
  if (network === null || notNowThisVisit.has(network)) return null;
  return (await isNotNow(network)) ? null : network;
}

/**
 * Whether the network the Admin is using is outside every saved Office Network (first live fixes,
 * ticket 03; spec 9-25). One small request when a page opens, when a hidden tab is shown again,
 * and every hour while shown; never while hidden and never two at once. An unknown address, a
 * covered one, a failed request or Not now for that network on this device means nothing to ask.
 * When not `isWanted` (not an Admin, Support Access, or no Clock-in) nothing is asked.
 */
export function useOfficeNetworkCheck(isWanted: boolean): OfficeNetworkCheck {
  const pathname = usePathname();
  const [asking, setAsking] = useState<string | null>(null);
  const isAsking = useRef(false);
  // Not now this visit, even when storage is refused and can't remember it.
  const notNowThisVisit = useRef(new Set<string>());
  const isMounted = useRef(true);

  const check = useCallback(() => {
    if (!isWanted || !isShown() || isAsking.current) return;
    isAsking.current = true;
    void (async () => {
      try {
        const network = await networkToAsk(notNowThisVisit.current);
        if (isMounted.current) setAsking(network);
      } catch {
        // Nothing to ask until the next check.
      } finally {
        isAsking.current = false;
      }
    })();
  }, [isWanted]);

  useEffect(() => {
    check();
  }, [check, pathname]);

  useEffect(() => {
    isMounted.current = true;
    const timer = setInterval(() => {
      if (isShown()) check();
    }, OFFICE_NETWORK_CHECK_MS);
    function checkWhenShown(): void {
      if (isShown()) check();
    }
    document.addEventListener("visibilitychange", checkWhenShown);
    return () => {
      isMounted.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", checkWhenShown);
    };
  }, [check]);

  const notNow = useCallback(() => {
    setAsking((network) => {
      if (network !== null) {
        notNowThisVisit.current.add(network);
        void rememberNotNow(network);
      }
      return null;
    });
  }, []);

  const added = useCallback(() => {
    setAsking(null);
  }, []);

  return { asking, notNow, added };
}
