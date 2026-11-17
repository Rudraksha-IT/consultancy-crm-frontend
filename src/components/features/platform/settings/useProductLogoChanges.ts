"use client";

import { useState } from "react";

import type { BrandLogo } from "@/components/ui/BrandMark";
import { useToast } from "@/components/ui/useToast";
import { LOGO_FILE_TYPES, LOGO_TEXT, MAX_LOGO_BYTES } from "@/constants/logo";
import { InvalidFieldsError, removeProductLogo, uploadProductLogo } from "@/lib/api";

import { setProductLogo } from "../productLogo";

const FILE_TYPES: readonly string[] = LOGO_FILE_TYPES;

/** Why a chosen file can't be the logo, checked before sending; the server checks it again. */
function refusalOf(file: File): string | null {
  if (!FILE_TYPES.includes(file.type)) return LOGO_TEXT.wrongKind;
  if (file.size > MAX_LOGO_BYTES) return LOGO_TEXT.tooBig;
  return null;
}

function uploadProblem(error: unknown): string {
  const [message] = error instanceof InvalidFieldsError ? (error.fieldErrors.file ?? []) : [];
  return message ?? LOGO_TEXT.saveFailed;
}

/** Change the product's logo (issue 65); each change shows everywhere at once. */
export function useProductLogoChanges() {
  const { showToast } = useToast();
  const [problem, setProblem] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function change(
    work: () => Promise<BrandLogo | null>,
    onFail: (error: unknown) => string,
    done: string,
  ): Promise<void> {
    setProblem(null);
    setIsBusy(true);
    try {
      setProductLogo(await work());
      showToast(done);
    } catch (error) {
      setProblem(onFail(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function upload(file: File): Promise<void> {
    const refusal = refusalOf(file);
    if (refusal !== null) {
      setProblem(refusal);
      return;
    }
    await change(() => uploadProductLogo(file), uploadProblem, LOGO_TEXT.saved);
  }

  /** Rejects when it failed, so the confirm dialog says so (LOGO_TEXT.removeFailed). */
  async function remove(): Promise<void> {
    setProblem(null);
    setIsBusy(true);
    try {
      await removeProductLogo();
      setProductLogo(null);
      showToast(LOGO_TEXT.removed);
    } finally {
      setIsBusy(false);
    }
  }

  return { problem, isBusy, upload, remove };
}
