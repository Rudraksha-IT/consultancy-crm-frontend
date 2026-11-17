"use client";

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
} from "@/lib/api";
import { DetailAnswerSchema } from "@/lib/api/types";

import type { Deleting } from "./DocumentChecklist";

type BinActions = {
  /** Why taking something out failed, if it did. */
  problem: string | null;
  /** Put in the Bin with the reason, or (an Admin) delete for good; rejects on failure. */
  remove: (deleting: Deleting, reason: string, forGood: boolean) => Promise<void>;
  takeOut: (target: BinTarget, name: string) => Promise<void>;
};

/** Deleting a Student's Documents and files, and taking them back out of the Bin (issue 79). */
export function useBinActions(
  studentId: number,
  onChanged: (checklist: Checklist) => void,
): BinActions {
  const { showToast } = useToast();
  const [problem, setProblem] = useState<string | null>(null);
  return {
    problem,
    remove: async ({ target, name }, reason, forGood) => {
      const saved = forGood
        ? await deleteForGood(studentId, target)
        : await putInBin(studentId, target, reason);
      showToast(forGood ? BIN_TEXT.deleted(name) : BIN_TEXT.putInBinDone);
      onChanged(saved);
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
