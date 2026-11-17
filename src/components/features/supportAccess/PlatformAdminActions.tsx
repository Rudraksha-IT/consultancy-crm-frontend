"use client";

import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/useToast";
import { SUPPORT_TEXT } from "@/constants/supportAccess";
import { InvalidFieldsError, sendResetCodeTo, signOutStaff, type Employee } from "@/lib/api";

type PlatformAdminActionsProps = {
  employee: Employee;
  /** Sends the Code; the office's own endpoint by default. */
  sendCode?: (staffId: number) => Promise<void>;
  /** Signs them out everywhere; the office's own endpoint by default. */
  signOut?: (staffId: number) => Promise<void>;
};

/**
 * In Employees → Manage, for a Platform Admin inside the office only (spec 11a): send anyone,
 * Admins included, a password reset Code, or sign them out of every device.
 */
export function PlatformAdminActions({
  employee,
  sendCode = sendResetCodeTo,
  signOut = signOutStaff,
}: PlatformAdminActionsProps) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<"code" | "signOut" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(which: "code" | "signOut"): Promise<void> {
    setBusy(which);
    setError(null);
    try {
      if (which === "code") {
        await sendCode(employee.id);
        showToast(SUPPORT_TEXT.resetCodeSent(employee.email));
      } else {
        await signOut(employee.id);
        showToast(SUPPORT_TEXT.signedOut(employee.name));
      }
    } catch (failure) {
      setError(messageOf(failure));
    }
    setBusy(null);
  }

  return (
    <div className="border-warn bg-warn-tint rounded-control grid gap-3 border p-4">
      <b className="text-warn flex items-center gap-2">
        <Icon name="shield" />
        {SUPPORT_TEXT.onlyPlatformAdmin}
      </b>
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          isLoading={busy === "code"}
          loadingLabel={SUPPORT_TEXT.sendResetCode}
          isDisabled={busy !== null}
          onClick={() => {
            void run("code");
          }}
        >
          {SUPPORT_TEXT.sendResetCode}
        </Button>
        <Button
          size="sm"
          isLoading={busy === "signOut"}
          loadingLabel={SUPPORT_TEXT.signOutEverywhere}
          isDisabled={busy !== null}
          onClick={() => {
            void run("signOut");
          }}
        >
          {SUPPORT_TEXT.signOutEverywhere}
        </Button>
      </div>
      {error !== null && <Banner tone="problem">{error}</Banner>}
    </div>
  );
}

function messageOf(failure: unknown): string {
  if (failure instanceof InvalidFieldsError) {
    const detail = failure.fieldErrors.detail;
    if (detail !== undefined) return detail.join(" ");
  }
  return SUPPORT_TEXT.actionFailed;
}
