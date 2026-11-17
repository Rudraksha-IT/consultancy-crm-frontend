"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { LABELS } from "@/constants/messages";
import { PLATFORM_TEAM_TEXT as TEXT } from "@/constants/platformTeam";
import {
  InvalidFieldsError,
  invitePlatformAdmin,
  type PlatformAdminRow,
  type PlatformTeamField,
} from "@/lib/api";

const FORM_ID = "add-platform-admin";

type Errors = Partial<Record<PlatformTeamField, string[]>>;

type AddPlatformAdminDialogProps = {
  onAdded: (admin: PlatformAdminRow) => void;
  onClose: () => void;
};

/** Invite a Platform Admin by email (issue 65): they get a Code and choose their password. */
export function AddPlatformAdminDialog({ onAdded, onClose }: AddPlatformAdminDialogProps) {
  const [errors, setErrors] = useState<Errors>({});
  const [isSending, setIsSending] = useState(false);

  async function send(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const admin = { name: readField(form, "name"), email: readField(form, "email") };
    const missing = missingFields(admin);
    setErrors(missing);
    if (Object.keys(missing).length > 0) return;
    setIsSending(true);
    try {
      onAdded(await invitePlatformAdmin(admin));
    } catch (error) {
      setErrors(
        error instanceof InvalidFieldsError ? error.fieldErrors : { detail: [TEXT.changeFailed] },
      );
      setIsSending(false);
    }
  }

  return (
    <Dialog
      isOpen
      title={TEXT.addTitle}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            isLoading={isSending}
            loadingLabel={LABELS.sending}
          >
            {TEXT.sendInvite}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={(event) => void send(event)} className="grid gap-5">
        <p className="text-ink-2">{TEXT.addIntro}</p>
        {errors.detail !== undefined && <Banner tone="problem">{errors.detail.join(" ")}</Banner>}
        <TextField label={TEXT.name} name="name" autoComplete="off" errors={errors.name} />
        <TextField
          label={TEXT.email}
          name="email"
          type="email"
          autoComplete="off"
          errors={errors.email}
        />
      </form>
    </Dialog>
  );
}

function missingFields(admin: { name: string; email: string }): Errors {
  const missing: Errors = {};
  if (admin.name.trim() === "") missing.name = [TEXT.enterName];
  if (admin.email.trim() === "") missing.email = [TEXT.enterEmail];
  return missing;
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
