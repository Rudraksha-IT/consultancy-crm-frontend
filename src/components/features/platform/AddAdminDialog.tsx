"use client";

import type { SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { ADMIN_TEXT } from "@/constants/consultancyStatus";
import { LABELS } from "@/constants/messages";

import { useAddAdmin } from "./useAddAdmin";

const FORM_ID = "add-admin";

type AddAdminDialogProps = {
  /** The office to add an Admin to; null shows nothing. */
  office: { id: number; name: string } | null;
  /** The Admin was invited; gets their name for the toast. */
  onAdded: (name: string) => void;
  onClose: () => void;
};

/**
 * Add an Admin to a set-up office from the Platform (issue 64): their name and email. They are
 * emailed a Code and choose their own password, as with any Invite.
 */
export function AddAdminDialog({ office, onAdded, onClose }: AddAdminDialogProps) {
  if (office === null) return null;
  return <OpenAddAdminDialog office={office} onAdded={onAdded} onClose={onClose} />;
}

type OpenProps = AddAdminDialogProps & { office: { id: number; name: string } };

function OpenAddAdminDialog({ office, onAdded, onClose }: OpenProps) {
  const { isSending, fieldErrors, error, send } = useAddAdmin(office.id, onAdded);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void send({ name: readField(form, "name"), email: readField(form, "email") });
  }

  return (
    <Dialog
      isOpen
      title={ADMIN_TEXT.addAdminTo(office.name)}
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
            {ADMIN_TEXT.sendInvite}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="grid gap-5" noValidate>
        <p className="text-ink-2">{ADMIN_TEXT.inviteExplained}</p>
        {error !== null && <Banner tone="problem">{error}</Banner>}
        <TextField
          label={ADMIN_TEXT.name}
          name="name"
          autoComplete="off"
          errors={fieldErrors.name}
        />
        <TextField
          label={ADMIN_TEXT.email}
          name="email"
          type="email"
          autoComplete="off"
          errors={fieldErrors.email}
        />
      </form>
    </Dialog>
  );
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
