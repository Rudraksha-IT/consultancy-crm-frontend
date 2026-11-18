"use client";

import { useState, type SubmitEvent } from "react";

import { useSetOfficeDetails } from "@/components/features/shell/officeDetails";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { OFFICE_DETAILS_TEXT as TEXT } from "@/constants/officeDetails";
import { InvalidFieldsError, saveOfficeDetails, type OfficeDetails } from "@/lib/api";
import {
  footerLines,
  refusedOfficeDetails,
  tidyOfficeDetails,
  type OfficeDetailsErrors,
} from "@/lib/officeDetails/officeDetails";

/** Each detail's input name, in the order the form shows them (the first refused one gets focus). */
const NAMES = {
  contactEmail: "contact_email",
  phone: "phone",
  website: "website",
  addressLine1: "address_line1",
  addressLine2: "address_line2",
} as const satisfies Record<keyof OfficeDetails, string>;
const ORDER: readonly (keyof OfficeDetails)[] = [
  "contactEmail",
  "phone",
  "website",
  "addressLine1",
  "addressLine2",
];

/**
 * Configuration → General → Office details (spec stories 11-16): the contact email (needed before
 * anyone can email a Student; replies go there), phone, two address lines and website, with the
 * email footer they make. Saving shows them across the app at once; the page stays where it was.
 */
export function OfficeDetailsSettings() {
  const { consultancy } = useCurrentStaff();
  const setOfficeDetails = useSetOfficeDetails();
  const { showToast } = useToast();
  const [details, setDetails] = useState<OfficeDetails>(consultancy.officeDetails);
  const [errors, setErrors] = useState<OfficeDetailsErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function edit(field: keyof OfficeDetails): (value: string) => void {
    return (value) => {
      setDetails((known) => ({ ...known, [field]: value }));
    };
  }

  async function save(form: HTMLFormElement, tidy: OfficeDetails): Promise<void> {
    setIsSaving(true);
    try {
      const saved = await saveOfficeDetails(tidy);
      setOfficeDetails(saved);
      setDetails(saved.officeDetails);
      showToast(saved.hasContactEmail ? TEXT.saved : TEXT.savedWithoutEmail);
    } catch (error) {
      if (error instanceof InvalidFieldsError) {
        const refused = refusedByServer(error.fieldErrors);
        setErrors(refused);
        focusFirst(form, refused);
      } else {
        setProblem(TEXT.saveFailed);
      }
    }
    setIsSaving(false);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const tidy = tidyOfficeDetails(details);
    const refused = refusedOfficeDetails(tidy);
    setErrors(refused);
    setProblem(null);
    if (Object.keys(refused).length > 0) focusFirst(form, refused);
    else void save(form, tidy);
  }

  return (
    <Section title={TEXT.title}>
      <div className="grid gap-4">
        <p className="text-ink-2">{TEXT.help}</p>
        <Panel isPadded>
          <form noValidate onSubmit={handleSubmit} className="grid min-w-0 gap-5">
            <TextField
              label={TEXT.contactEmail}
              name={NAMES.contactEmail}
              type="email"
              autoComplete="off"
              placeholder={TEXT.contactEmailPlaceholder}
              hint={TEXT.contactEmailHint}
              value={details.contactEmail}
              onChange={edit("contactEmail")}
              errors={errors.contactEmail}
            />
            <div className="tablet:grid-cols-2 grid min-w-0 gap-5">
              <TextField
                label={TEXT.phone}
                name={NAMES.phone}
                type="tel"
                autoComplete="off"
                placeholder={TEXT.phonePlaceholder}
                isOptional
                value={details.phone}
                onChange={edit("phone")}
                errors={errors.phone}
              />
              <TextField
                label={TEXT.website}
                name={NAMES.website}
                type="url"
                autoComplete="off"
                placeholder={TEXT.websitePlaceholder}
                hint={TEXT.websiteHint}
                isOptional
                value={details.website}
                onChange={edit("website")}
                errors={errors.website}
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <TextField
                label={TEXT.address}
                name={NAMES.addressLine1}
                autoComplete="off"
                placeholder={TEXT.addressLine1Placeholder}
                isOptional
                value={details.addressLine1}
                onChange={edit("addressLine1")}
                errors={errors.addressLine1}
              />
              <TextField
                label={TEXT.addressLine2}
                isLabelHidden
                name={NAMES.addressLine2}
                autoComplete="off"
                placeholder={TEXT.addressLine2Placeholder}
                isOptional
                value={details.addressLine2}
                onChange={edit("addressLine2")}
                errors={errors.addressLine2}
              />
            </div>
            <FooterPreview officeName={consultancy.name} details={tidyOfficeDetails(details)} />
            {problem !== null && <Banner tone="problem">{problem}</Banner>}
            <div>
              <Button type="submit" isLoading={isSaving}>
                {TEXT.save}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </Section>
  );
}

/** The server's own words for each refused field. */
function refusedByServer(fieldErrors: Partial<Record<string, string[]>>): OfficeDetailsErrors {
  const refused: OfficeDetailsErrors = {};
  for (const field of ORDER) {
    const messages = fieldErrors[field];
    if (messages !== undefined) refused[field] = messages;
  }
  return refused;
}

/** Put focus in the first refused field, in the order the form shows them. */
function focusFirst(form: HTMLFormElement, refused: OfficeDetailsErrors): void {
  const first = ORDER.find((field) => refused[field] !== undefined);
  if (first === undefined) return;
  const input = form.elements.namedItem(NAMES[first]);
  if (input instanceof HTMLInputElement) input.focus();
}

type FooterPreviewProps = { officeName: string; details: OfficeDetails };

/** The bottom of every office email, as it will look with what is typed now. */
function FooterPreview({ officeName, details }: FooterPreviewProps) {
  return (
    <div data-testid="footer-preview" className="grid min-w-0 gap-2">
      <span className="text-small text-ink-2">{TEXT.footerPreview}</span>
      <div className="bg-fill rounded-control text-small text-ink-2 grid min-w-0 gap-1 p-4 break-words">
        <b className="text-ink">{officeName}</b>
        {footerLines(details).map((line) => (
          <span key={line.part}>{line.text}</span>
        ))}
        <p className="mt-2">
          {TEXT.noReply}
          {details.contactEmail !== "" && TEXT.writeTo(details.contactEmail)}
        </p>
      </div>
    </div>
  );
}
