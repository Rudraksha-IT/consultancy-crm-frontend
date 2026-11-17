"use client";

import type { SubmitEvent } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PlatformBrand } from "@/components/features/platform/PlatformBrand";
import { LABELS, MESSAGES } from "@/constants/messages";

import { AuthLayout } from "./AuthLayout";
import { AuthMessages } from "./AuthMessages";
import { useCentralLogin, type CentralLoginState } from "./useCentralLogin";

/**
 * The Central login (spec 13e, issue 44): a Staff member who doesn't know their office's address
 * types their email and is emailed a link to each office's login page. The confirmation is the
 * same for every email, so the screen never says who works where.
 */
export function CentralLogin() {
  const lookup = useCentralLogin();
  return (
    <AuthLayout
      brand={<PlatformBrand tagline={LABELS.staffLogin} />}
      title={LABELS.findYourOffice}
      intro={lookup.isSent ? MESSAGES.officeLinksSent : MESSAGES.centralLoginIntro}
    >
      {lookup.isSent ? <Sent lookup={lookup} /> : <EmailForm lookup={lookup} />}
    </AuthLayout>
  );
}

function EmailForm({ lookup }: { lookup: CentralLoginState }) {
  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("email");
    void lookup.send(typeof value === "string" ? value : "");
  }

  return (
    <form className="grid gap-5.5" noValidate onSubmit={handleSubmit}>
      <TextField label={LABELS.email} name="email" type="email" autoComplete="username" />
      <AuthMessages error={lookup.error} notice={null} />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={lookup.isSubmitting}
        loadingLabel={LABELS.sending}
      >
        {LABELS.emailMeMyOffices}
      </Button>
    </form>
  );
}

function Sent({ lookup }: { lookup: CentralLoginState }) {
  return (
    <div className="grid gap-5.5">
      <p role="status" className="text-ink-2">
        {MESSAGES.officeLinksSentHelp}
      </p>
      <Button variant="secondary" onClick={lookup.startAgain}>
        {LABELS.tryAnotherEmail}
      </Button>
    </div>
  );
}
