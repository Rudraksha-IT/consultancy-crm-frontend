"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { PLATFORM_ACCOUNT_TEXT as TEXT } from "@/constants/platformAccount";
import { InvalidFieldsError, savePlatformName } from "@/lib/api";

import { useCurrentPlatformAdmin } from "../platformAdminContext";

/**
 * My name on the Platform, changed without a password; my email is shown but can't be changed
 * here (issue 65).
 */
export function AccountDetailsForm() {
  const { admin, setAdmin } = useCurrentPlatformAdmin();
  const { showToast } = useToast();
  const [name, setName] = useState(admin.name);
  const [nameErrors, setNameErrors] = useState<readonly string[] | undefined>(undefined);
  const [problem, setProblem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!isReadyToSend()) return;
    setIsSaving(true);
    try {
      const saved = await savePlatformName(name);
      setAdmin(saved);
      setName(saved.name);
      showToast(TEXT.detailsSaved);
    } catch (error) {
      if (error instanceof InvalidFieldsError) setNameErrors(error.fieldErrors.name);
      else setProblem(TEXT.saveFailed);
    }
    setIsSaving(false);
  }

  /** Say what must be fixed before asking the server; true when there is nothing. */
  function isReadyToSend(): boolean {
    const isEmpty = name.trim() === "";
    const isUnchanged = name.trim() === admin.name;
    setNameErrors(isEmpty ? [TEXT.enterName] : undefined);
    setProblem(!isEmpty && isUnchanged ? TEXT.nothingChanged : null);
    return !isEmpty && !isUnchanged;
  }

  return (
    <Panel isPadded>
      <form noValidate onSubmit={(event) => void save(event)} className="grid gap-5">
        <div className="tablet:grid-cols-2 grid gap-5">
          <TextField
            label={TEXT.name}
            name="name"
            autoComplete="name"
            value={name}
            onChange={setName}
            errors={nameErrors}
          />
          <div className="grid content-start gap-2">
            <span className="text-secondary text-ink font-semibold">{TEXT.email}</span>
            <span className="min-h-control text-body text-ink flex items-center break-all">
              {admin.email}
            </span>
            <span className="text-small text-ink-2">{TEXT.emailCantChange}</span>
          </div>
        </div>
        {problem !== null && <Banner tone="problem">{problem}</Banner>}
        <div>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {TEXT.saveDetails}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
