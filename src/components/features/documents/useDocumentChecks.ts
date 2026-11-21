"use client";

import type { RecordId } from "@/lib/recordId";
import { useState } from "react";

import { useToast } from "@/components/ui/useToast";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { checkDocument, type Checklist } from "@/lib/api";

import { checkFailure } from "./checkFailure";
import type { CheckedItem } from "./DocumentChecklist";

type DocumentChecks = {
  /** A "correct" mark is being saved. */
  isChecking: boolean;
  /** Why the last mark failed, if it did. */
  problem: string | null;
  /** The item whose rejection reason is being asked for. */
  rejecting: CheckedItem | null;
  verify: (item: CheckedItem) => Promise<void>;
  startRejecting: (item: CheckedItem) => void;
  stopRejecting: () => void;
};

/**
 * Marking a Student's Documents correct straight away, or asking why one is rejected (spec 68).
 * `onChecked` gets the checklist as it is after the mark.
 */
export function useDocumentChecks(
  studentId: RecordId,
  onChecked: (checklist: Checklist) => void,
): DocumentChecks {
  const { showToast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<CheckedItem | null>(null);

  async function verify({ documentId, typeName }: CheckedItem): Promise<void> {
    setIsChecking(true);
    setProblem(null);
    try {
      const saved = await checkDocument(studentId, documentId, { verification: "verified" });
      showToast(DOCUMENT_TEXT.verified(typeName));
      onChecked(saved);
    } catch (error) {
      setProblem(checkFailure(error));
    } finally {
      setIsChecking(false);
    }
  }

  return {
    isChecking,
    problem,
    rejecting,
    verify,
    startRejecting: (item) => {
      setProblem(null);
      setRejecting(item);
    },
    stopRejecting: () => {
      setRejecting(null);
    },
  };
}
