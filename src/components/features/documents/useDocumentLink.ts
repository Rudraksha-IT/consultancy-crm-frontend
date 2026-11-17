"use client";

import { useState } from "react";

import { DOCUMENT_TEXT } from "@/constants/documents";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import { fetchDocumentLink } from "@/lib/api";
import { openBlankTab } from "@/lib/documents";

export type LinkAction = "open" | "download";

/**
 * Open or save one file of a Document through a link that works for a few minutes (spec 70). The new tab
 * for opening is made at the click, before the link arrives, so popup blockers allow it; a
 * download goes through this page, which stays where it is.
 */
export function useDocumentLink(studentId: number): {
  show: (documentId: number, fileId: number, action: LinkAction) => Promise<void>;
  failure: string | null;
} {
  const navigate = useFullPageNavigation();
  const [failure, setFailure] = useState<string | null>(null);

  async function show(documentId: number, fileId: number, action: LinkAction): Promise<void> {
    setFailure(null);
    const tab = action === "open" ? openBlankTab() : null;
    try {
      const url = await fetchDocumentLink(studentId, documentId, fileId, action);
      if (tab === null) {
        navigate(url);
        return;
      }
      tab.opener = null;
      tab.location.replace(url);
    } catch {
      tab?.close();
      setFailure(DOCUMENT_TEXT.linkFailed);
    }
  }

  return { show, failure };
}
