"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { INBOX_CHECK_MS } from "@/constants/inbox";
import { fetchInboxCheck, type InboxCheck } from "@/lib/api";

import type { InboxCheckState } from "./inboxCheck";

const NOTHING_YET: InboxCheck = { unread: 0, latest: null };

function isShown(): boolean {
  return document.visibilityState !== "hidden";
}

/**
 * Checks for new Inbox messages with one small request (spec 129): when the shell opens, on every
 * page change, about every 30 seconds while the tab is shown, as soon as a hidden tab is shown
 * again, and whenever `refresh` is called. Nothing is asked while the tab is hidden. A failed
 * check keeps the last answer; an answer overtaken by a newer ask is dropped. When not
 * `isWanted` (a Platform Admin, who has no Inbox) nothing is asked.
 */
export function useInboxCheckLoader(isWanted: boolean): InboxCheckState {
  const pathname = usePathname();
  const [check, setCheck] = useState<InboxCheck>(NOTHING_YET);
  const latestAsk = useRef(0);

  const refresh = useCallback(() => {
    if (!isWanted) return;
    latestAsk.current += 1;
    const ask = latestAsk.current;
    void (async () => {
      try {
        const found = await fetchInboxCheck();
        if (ask === latestAsk.current) setCheck(found);
      } catch {
        // The last answer stays until the next check.
      }
    })();
  }, [isWanted]);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isShown()) refresh();
    }, INBOX_CHECK_MS);
    function checkWhenShown(): void {
      if (isShown()) refresh();
    }
    document.addEventListener("visibilitychange", checkWhenShown);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", checkWhenShown);
      // Answers still on their way after the shell closes are dropped.
      latestAsk.current += 1;
    };
  }, [refresh]);

  return useMemo(() => ({ unread: check.unread, latest: check.latest, refresh }), [check, refresh]);
}
