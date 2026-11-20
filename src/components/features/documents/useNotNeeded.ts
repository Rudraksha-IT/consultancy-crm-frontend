"use client";

import type { RecordId } from "@/lib/recordId";
import { useToast } from "@/components/ui/useToast";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { dropStudentDocument, requirementRefusal, type Checklist } from "@/lib/api";

/**
 * "Not needed": take a document asked for one Student alone off their checklist (spec 63b).
 * `onDropped` gets the checklist as it is afterwards. `drop` rejects when it failed;
 * `notNeededFailure` gives the words.
 */
export function useNotNeeded(
  studentId: RecordId,
  onDropped: (checklist: Checklist) => void,
): { drop: (documentTypeId: number) => Promise<void> } {
  const { showToast } = useToast();

  async function drop(documentTypeId: number): Promise<void> {
    const saved = await dropStudentDocument(studentId, documentTypeId);
    showToast(DOCUMENT_TEXT.takenOff);
    onDropped(saved);
  }

  return { drop };
}

/** Why "Not needed" failed, in the server's own words when it gave them. */
export function notNeededFailure(error: unknown): string {
  return requirementRefusal(error) ?? DOCUMENT_TEXT.saveFailed;
}
