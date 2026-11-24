"use client";

import clsx from "clsx";

import { Banner } from "@/components/ui/Banner";
import { BrandMark } from "@/components/ui/BrandMark";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionMenu, useSectionChoice, type MenuSection } from "@/components/ui/SectionMenu";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { LOGO_ACCEPT, LOGO_TEXT } from "@/constants/logo";
import { useProductName } from "@/components/features/brand/ProductName";
import { PRODUCT_NAME_TEXT } from "@/constants/productName";
import { PLATFORM_EMAIL_TEXT, PLATFORM_SETTINGS_TEXT as TEXT } from "@/constants/platformTeam";

import { usePlatformAccountSections } from "../account/accountSections";
import { useProductLogo, useProductMark } from "../productLogo";
import { PlatformEmailSettings } from "./PlatformEmailSettings";
import { ProductNameSection } from "./ProductNameSection";
import { SavedLogosSection } from "./SavedLogosSection";
import { useProductLogoChanges } from "./useProductLogoChanges";
import { useSavedLogos } from "./useSavedLogos";

/**
 * The Platform's one Settings (list tidy-ups 04), one section at a time like an office's: the
 * product's name (ticket 15), its logo with the saved logos to pick from (issue 65, first live
 * fixes ticket 07), whether email works (ADR 0023), then the Platform Admin's own details,
 * password and two-step login (issues 59 and 61), which had a page of their own behind a gear.
 */
export function PlatformSettingsPage() {
  const choice = useSectionChoice("name");
  const sections: MenuSection[] = [
    {
      id: "name",
      title: PRODUCT_NAME_TEXT.title,
      hasOwnTitle: true,
      content: <ProductNameSection />,
    },
    { id: "logo", title: TEXT.logoTitle, hasOwnTitle: true, content: <ProductLogoParts /> },
    {
      id: "email",
      title: PLATFORM_EMAIL_TEXT.title,
      hasOwnTitle: true,
      content: <PlatformEmailSettings />,
    },
    ...usePlatformAccountSections(),
  ];
  return (
    <>
      <PageHeader title={TEXT.title} subtitle={TEXT.intro} />
      <SectionMenu
        label={TEXT.title}
        backLabel={TEXT.backLabel}
        sections={sections}
        choice={choice}
      />
    </>
  );
}

/** The product's logo: upload or change it, then the saved logos to pick from. */
function ProductLogoParts() {
  const logo = useProductLogo();
  const mark = useProductMark();
  const savedLogos = useSavedLogos();
  const changes = useProductLogoChanges(savedLogos.reload);
  const productName = useProductName();

  return (
    <div className="grid min-w-0 gap-8">
      <Section title={TEXT.logoTitle}>
        {" "}
        <p className="text-ink-2">{TEXT.logoHelp}</p>
        <Panel isPadded>
          <div className="grid gap-5">
            <div
              data-testid="logo-preview"
              className="bg-fill rounded-panel flex min-h-18 min-w-0 items-center gap-3 p-4"
            >
              <BrandMark name={productName} logo={mark} />
              <b className="text-body truncate font-bold">{productName}</b>
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
      </Section>
      <SavedLogosSection logos={savedLogos} />
    </div>
  );
}
