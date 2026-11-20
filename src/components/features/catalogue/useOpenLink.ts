"use client";

import { useState } from "react";

import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import { openBlankTab } from "@/lib/documents";

/**
 * Open a file in a new tab through a link that works for a few minutes (ADR 0015). The tab is made
 * at the click, before the link arrives, so popup blockers allow it; if the browser blocked it,
 * this page goes to the file instead. `failure` holds the given words after a failed try.
 */
export function useOpenLink(failureText: string): {
  open: (link: () => Promise<string>) => Promise<void>;
  failure: string | null;
} {
  const navigate = useFullPageNavigation();
  const [failure, setFailure] = useState<string | null>(null);

  async function open(link: () => Promise<string>): Promise<void> {
    setFailure(null);
    const tab = openBlankTab();
    try {
      const url = await link();
      if (tab === null) {
        navigate(url);
        return;
      }
      tab.opener = null;
      tab.location.replace(url);
    } catch {
      tab?.close();
      setFailure(failureText);
    }
  }

  return { open, failure };
}
