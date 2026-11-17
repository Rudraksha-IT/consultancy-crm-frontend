"use client";

import Link from "next/link";
import { useState, type SubmitEvent } from "react";

import { ThemeEditor } from "@/components/features/theme/ThemeEditor";
import { ThemePreview } from "@/components/features/theme/ThemePreview";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedChoice } from "@/components/ui/SegmentedChoice";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/TextField";
import { ConsultancyStatus, SETUP_TEXT, STATUS_TEXT } from "@/constants/consultancyStatus";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import type { NewConsultancy } from "@/lib/api";
import { tomorrowIso } from "@/lib/dates";
import { DEFAULT_THEME, type ThemeConfig } from "@/lib/theme";

import { useCreateConsultancy } from "./useCreateConsultancy";
import { useProductDomain } from "./useProductDomain";

/**
 * Create a Consultancy: its name, the front part of its address (the rest is the backend's
 * product domain), starting Status and colours. No Admin: they are added from its row once it is
 * set up (issue 64).
 */
export function NewConsultancyForm() {
  const { isSubmitting, fieldErrors, error, submit } = useCreateConsultancy();
  const productDomain = useProductDomain();
  const [subdomain, setSubdomain] = useState("");
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [status, setStatus] = useState<StartingStatus>(ConsultancyStatus.Evaluation);
  const [tomorrow] = useState(() => tomorrowIso());

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submit(readConsultancy(new FormData(event.currentTarget), theme, status));
  }

  return (
    <>
      <PageHeader
        title={LABELS.newConsultancy}
        crumbs={
          <Link
            href={ROUTES.platformHome}
            className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
          >
            <Icon name="left" />
            {LABELS.consultancies}
          </Link>
        }
      />
      <form onSubmit={handleSubmit} className="grid gap-8">
        <Panel isPadded>
          <div className="tablet:grid-cols-2 grid gap-5">
            <TextField label={LABELS.consultancyName} name="name" errors={fieldErrors.name} />
            <TextField
              label={LABELS.subdomain}
              name="subdomain"
              autoComplete="off"
              value={subdomain}
              onChange={(typed) => {
                // Addresses are lowercase; the server refuses anything else (issue 64).
                setSubdomain(typed.toLowerCase());
              }}
              suffix={productDomain === null ? "" : `.${productDomain}`}
              hint={addressHint(subdomain, productDomain)}
              errors={fieldErrors.subdomain}
            />
            <p className="text-secondary text-ink-2 tablet:col-span-2 flex items-start gap-2">
              <Icon name="users" />
              {SETUP_TEXT.adminsAfterSetup}
            </p>
          </div>
        </Panel>
        <Panel isPadded>
          <fieldset className="grid gap-4">
            <legend className="text-section-title mb-4">{STATUS_TEXT.startingStatus}</legend>
            <SegmentedChoice
              label={STATUS_TEXT.startingStatus}
              name="status"
              value={status}
              onChange={setStatus}
              options={STARTING_STATUSES}
            />
            {fieldErrors.status !== undefined && (
              <p className="text-bad text-small font-semibold">{fieldErrors.status.join(" ")}</p>
            )}
            {status === ConsultancyStatus.Active && (
              <div className="tablet:grid-cols-2 grid gap-5">
                <TextField
                  label={STATUS_TEXT.paidUntil}
                  name="paidUntil"
                  type="date"
                  min={tomorrow}
                  hint={STATUS_TEXT.paidUntilHint}
                  errors={fieldErrors.paidUntil}
                />
              </div>
            )}
          </fieldset>
        </Panel>
        <Panel isPadded>
          <h2 className="text-section-title">{LABELS.colours}</h2>
          <ThemeEditor value={theme} onChange={setTheme} />
          <ThemePreview theme={theme} />
        </Panel>
        {error !== null && <Banner tone="problem">{error}</Banner>}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            loadingLabel={LABELS.creating}
          >
            {LABELS.createConsultancy}
          </Button>
          <ButtonLink href={ROUTES.platformHome} variant="ghost">
            {LABELS.cancel}
          </ButtonLink>
        </div>
      </form>
    </>
  );
}

type StartingStatus = NewConsultancy["status"];

const STARTING_STATUSES = [
  { value: ConsultancyStatus.Evaluation, label: STATUS_TEXT.evaluationForDays },
  { value: ConsultancyStatus.Active, label: STATUS_TEXT.startActive },
] as const;

function readConsultancy(
  form: FormData,
  theme: ThemeConfig,
  status: StartingStatus,
): NewConsultancy {
  return {
    name: readField(form, "name"),
    subdomain: readField(form, "subdomain"),
    theme,
    status,
    paidUntil: readField(form, "paidUntil"),
  };
}

/** How to type the address, and the full address it makes once something is typed. */
function addressHint(subdomain: string, productDomain: string | null): string {
  const typed = subdomain.trim();
  if (productDomain === null || typed === "") return MESSAGES.subdomainHint;
  return `${MESSAGES.subdomainHint} ${MESSAGES.staffLogInAt(`${typed}.${productDomain}`)}`;
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
