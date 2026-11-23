"use client";

import clsx from "clsx";

import { Banner } from "@/components/ui/Banner";
import { BrandMark } from "@/components/ui/BrandMark";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { LOGO_ACCEPT, LOGO_TEXT } from "@/constants/logo";
import { LABELS } from "@/constants/messages";
import { PLATFORM_SETTINGS_TEXT as TEXT } from "@/constants/platformTeam";

import { useProductLogo, useProductMark } from "../productLogo";
import { PlatformEmailSettings } from "./PlatformEmailSettings";
import { SavedLogosSection } from "./SavedLogosSection";
import { useProductLogoChanges } from "./useProductLogoChanges";
import { useSavedLogos } from "./useSavedLogos";

/**
 * The Platform's Settings tab: whether email works (ADR 0023), the product's logo (issue 65) and
 * the saved logos to pick from (first live fixes, ticket 07).
 */
export function PlatformSettingsPage() {
  const logo = useProductLogo();
  const mark = useProductMark();
  const savedLogos = useSavedLogos();
  const changes = useProductLogoChanges(savedLogos.reload);

  return (
    <>
      <PageHeader title={TEXT.title} subtitle={TEXT.intro} />
      <div className="grid min-w-0 gap-8">
        <PlatformEmailSettings />
        <Section title={TEXT.logoTitle}>
          <div className="wide:grid-cols-[minmax(0,var(--spacing-settings-label))_minmax(0,1fr)] grid gap-x-12 gap-y-6">
            <p className="text-ink-2">{TEXT.logoHelp}</p>
            <Panel isPadded>
              <div className="grid gap-5">
                <div
                  data-testid="logo-preview"
                  className="bg-fill rounded-panel flex min-h-18 min-w-0 items-center gap-3 p-4"
                >
                  <BrandMark name={LABELS.productName} logo={mark} />
                  <b className="text-body truncate font-bold">{LABELS.productName}</b>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    className={clsx(
                      buttonClasses("secondary", "md"),
                      "has-focus-visible:outline-accent has-focus-visible:outline-3 has-focus-visible:outline-offset-2",
                      changes.isBusy && "pointer-events-none opacity-50",
                    )}
                  >
                    <Icon name="upload" />
                    {logo === null ? LOGO_TEXT.upload : LOGO_TEXT.change}
                    <input
                      type="file"
                      accept={LOGO_ACCEPT}
                      disabled={changes.isBusy}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.item(0);
                        // The same file can be chosen again after a refusal.
                        event.target.value = "";
                        if (file) void changes.upload(file);
                      }}
                    />
                  </label>
                </div>
                {changes.problem !== null && <Banner tone="problem">{changes.problem}</Banner>}
              </div>
            </Panel>
          </div>
        </Section>
        <SavedLogosSection logos={savedLogos} />
      </div>
    </>
  );
}
