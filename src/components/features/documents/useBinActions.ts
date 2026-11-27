"use client";

import type { RecordId } from "@/lib/recordId";
import { useState } from "react";

import { useToast } from "@/components/ui/useToast";
import { BIN_TEXT } from "@/constants/documents";
import {
  ApiRequestError,
  InvalidFieldsError,
  deleteForGood,
  putInBin,
  takeOutOfBin,
  type BinTarget,
  type Checklist,
  type NamedFile,
} from "@/lib/api";
import { DetailAnswerSchema } from "@/lib/api/core/types";

/** What goes: the whole Document (`fileIds` null), or only these files of it. */
export type Removal = {
  documentId: RecordId;
  /** The Document's name, for the words after a whole delete. */
  name: string;
  /** The chosen files; null when every file was ticked, or the Document has only one. */
  files: readonly NamedFile[] | null;
};

type BinActions = {
  /** Why taking something out failed, if it did. */
  problem: string | null;
  /** Put in the Bin with the reason, or (an Admin) delete for good; rejects on failure. */
  remove: (removal: Removal, reason: string, forGood: boolean) => Promise<void>;
  takeOut: (target: BinTarget, name: string) => Promise<void>;
};

/** Deleting a Student's Documents and files, and taking them back out of the Bin (issue 79). */
export function useBinActions(
  studentId: RecordId,
  onChanged: (checklist: Checklist) => void,
): BinActions {
  const { showToast } = useToast();
  const [problem, setProblem] = useState<string | null>(null);
  return {
    problem,
    remove: async (removal, reason, forGood) => {
      // The whole Document in one call; otherwise one call per chosen file (UI revamp 11). Each
      // answer is the checklist as it now is, so files that did go show even if a later one fails.
      for (const target of targetsOf(removal)) {
        const saved = forGood
          ? await deleteForGood(studentId, target)
          : await putInBin(studentId, target, reason);
        onChanged(saved);
      }
      showToast(forGood ? deletedWords(removal) : BIN_TEXT.putInBinDone);
    },
    takeOut: async (target) => {
      setProblem(null);
      try {
        onChanged(await takeOutOfBin(studentId, target));
        showToast(BIN_TEXT.takenOut);
      } catch (error) {
        setProblem(binFailure(error));
      }
    },
  };
}

/** The whole Document, or each chosen file of it, as the API is asked. */
function targetsOf({ documentId, files }: Removal): BinTarget[] {
  if (files === null) return [{ documentId, fileId: null }];
  return files.map((file) => ({ documentId, fileId: file.id }));
}

/** "Passport deleted", "page-2.pdf deleted" or "2 files deleted". */
function deletedWords({ name, files }: Removal): string {
  if (files === null) return BIN_TEXT.deleted(name);
  const [only] = files;
  return files.length === 1 && only !== undefined
    ? BIN_TEXT.deleted(only.fileName)
    : BIN_TEXT.filesDeleted(files.length);
}

/** The server's short reason (a refused reason, already in the Bin, not yours), else a plain one. */
export function binFailure(error: unknown): string {
  if (error instanceof InvalidFieldsError) {
    const [first] = Object.values<string[] | undefined>(error.fieldErrors).flat();
    return first ?? BIN_TEXT.failed;
  }
  if (error instanceof ApiRequestError) {
    const detail = DetailAnswerSchema.safeParse(error.body);
    if (detail.success) return detail.data.detail;
  }
  return BIN_TEXT.failed;
}
