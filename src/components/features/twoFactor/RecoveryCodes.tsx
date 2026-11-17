"use client";

import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/useToast";
import { TWO_FACTOR_TEXT as TEXT } from "@/constants/twoFactor";

type RecoveryCodesProps = { codes: readonly string[] };

/** The recovery codes, shown once (issue 61), with Copy and Download. */
export function RecoveryCodes({ codes }: RecoveryCodesProps) {
  const { showToast } = useToast();
  const [copyFailed, setCopyFailed] = useState(false);
  const text = codes.join("\n");

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFailed(false);
      showToast(TEXT.codesCopied);
    } catch {
      setCopyFailed(true);
    }
  }

  function download(): void {
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: "text/plain" }));
    link.href = url;
    link.download = TEXT.codesFileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <ul
        aria-label={TEXT.codesLabel}
        className="rounded-control border-rule bg-fill phone:grid-cols-2 grid gap-x-6 gap-y-2 border p-4 tracking-wide tabular-nums select-all"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button icon="copy" onClick={() => void copy()}>
          {TEXT.copyCodes}
        </Button>
        <Button icon="download" onClick={download}>
          {TEXT.downloadCodes}
        </Button>
      </div>
      {copyFailed && <Banner tone="warning">{TEXT.copyFailed}</Banner>}
    </div>
  );
}
