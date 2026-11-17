"use client";

import clsx from "clsx";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { LOGO_ACCEPT, LOGO_TEXT } from "@/constants/logo";
import { LABELS } from "@/constants/messages";
import type { OfficeLogo } from "@/lib/api";

import { RemoveLogoButton } from "./RemoveLogoButton";
import { useOfficeLogoChanges } from "./useOfficeLogoChanges";

/**
 * Configuration → Office logo (spec 99c): upload or change the logo, remove it, and choose
 * whether the office name shows beside it. Every change shows across the app at once.
 */
export function OfficeLogoSettings() {
  const { consultancy } = useCurrentStaff();
  const changes = useOfficeLogoChanges();
  const logo = consultancy.logo;

  return (
    <Section title={LOGO_TEXT.title}>
      <div className="grid gap-4">
        <p className="text-ink-2">{LOGO_TEXT.help}</p>
        <Panel isPadded>
          <div className="grid gap-5">
            <div
              data-testid="logo-preview"
              className="bg-fill rounded-panel flex min-h-18 min-w-0 items-center p-4"
            >
              <BrandLockup
                name={consultancy.name}
                tagline={LABELS.consultancyTagline}
                logo={logo}
              />
            </div>
            <LogoPicker
              hasLogo={logo !== null}
              isBusy={changes.isBusy}
              onChoose={changes.upload}
              onRemove={changes.remove}
            />
            {logo !== null && (
              <ShowNameChoice
                logo={logo}
                isBusy={changes.isBusy}
                onChoose={changes.chooseShowName}
              />
            )}
            {changes.problem !== null && <Banner tone="problem">{changes.problem}</Banner>}
          </div>
        </Panel>
      </div>
    </Section>
  );
}

type LogoPickerProps = {
  hasLogo: boolean;
  isBusy: boolean;
  onChoose: (file: File) => Promise<void>;
  /** Removes it, after asking; rejects when that failed. */
  onRemove: () => Promise<void>;
};

/** "Upload a logo" (or "Change logo") opens the file picker; "Remove" once there is a logo. */
function LogoPicker({ hasLogo, isBusy, onChoose, onRemove }: LogoPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        className={clsx(
          buttonClasses("secondary", "md"),
          "has-focus-visible:outline-accent has-focus-visible:outline-3 has-focus-visible:outline-offset-2",
          isBusy && "pointer-events-none opacity-50",
        )}
      >
        <Icon name="upload" />
        {hasLogo ? LOGO_TEXT.change : LOGO_TEXT.upload}
        <input
          type="file"
          accept={LOGO_ACCEPT}
          disabled={isBusy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.item(0);
            // The same file can be chosen again after a refusal.
            event.target.value = "";
            if (file) void onChoose(file);
          }}
        />
      </label>
      {hasLogo && (
        <RemoveLogoButton
          title={LOGO_TEXT.removeTitle}
          body={LOGO_TEXT.removeBody}
          isDisabled={isBusy}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}

type ShowNameChoiceProps = {
  logo: OfficeLogo;
  isBusy: boolean;
  onChoose: (showName: boolean) => Promise<void>;
};

/** "Show the office name next to the logo", saved as soon as it is ticked or cleared. */
function ShowNameChoice({ logo, isBusy, onChoose }: ShowNameChoiceProps) {
  return (
    <label className="min-h-control rounded-control hover:bg-fill -mx-2 flex cursor-pointer items-center gap-3 px-2">
      <input
        type="checkbox"
        checked={logo.showName}
        disabled={isBusy}
        onChange={(event) => {
          void onChoose(event.target.checked);
        }}
        className="accent-accent size-5 flex-none"
      />
      {LOGO_TEXT.showName}
    </label>
  );
}
