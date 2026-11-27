"use client";

import { useState } from "react";

import { useSetOfficeLogo } from "@/components/features/shell/officeLogo";
import { useToast } from "@/components/ui/useToast";
import { LOGO_FILE_TYPES, LOGO_TEXT, MAX_LOGO_BYTES } from "@/constants/logo";
import { InvalidFieldsError, removeLogo, uploadLogo, type OfficeLogo } from "@/lib/api";

const FILE_TYPES: readonly string[] = LOGO_FILE_TYPES;

export type OfficeLogoChanges = {
  /** Why the last change failed, in words for the Admin; null when it didn't. */
  problem: string | null;
  isBusy: boolean;
  upload: (file: File) => Promise<void>;
  remove: () => Promise<void>;
};

/** Why a chosen file can't be the logo, checked before sending; the server checks it again. */
function refusalOf(file: File): string | null {
  if (!FILE_TYPES.includes(file.type)) return LOGO_TEXT.wrongKind;
  if (file.size > MAX_LOGO_BYTES) return LOGO_TEXT.tooBig;
  return null;
}

/** The server's own words for a refused file, or the general message. */
function uploadProblem(error: unknown): string {
  const [message] = error instanceof InvalidFieldsError ? (error.fieldErrors.file ?? []) : [];
  return message ?? LOGO_TEXT.saveFailed;
}

/** Change the office logo; each change is shown across the app at once (in the AppShell). */
export function useOfficeLogoChanges(): OfficeLogoChanges {
  const setOfficeLogo = useSetOfficeLogo();
  const { showToast } = useToast();
  const [problem, setProblem] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  /** Run one change and show its result everywhere; whether it worked. */
  async function change(
    work: () => Promise<OfficeLogo | null>,
    onFail: (error: unknown) => string,
  ): Promise<boolean> {
    setProblem(null);
    setIsBusy(true);
    try {
      setOfficeLogo(await work());
      return true;
    } catch (error) {
      setProblem(onFail(error));
      return false;
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
    if (await change(() => uploadLogo(file), uploadProblem)) showToast(LOGO_TEXT.saved);
  }

  /** Rejects when it failed, so the confirm dialog says so (LOGO_TEXT.removeFailed). */
  async function remove(): Promise<void> {
    setProblem(null);
    setIsBusy(true);
    try {
      await removeLogo();
      setOfficeLogo(null);
      showToast(LOGO_TEXT.removed);
    } finally {
      setIsBusy(false);
    }
  }

  return { problem, isBusy, upload, remove };
}
