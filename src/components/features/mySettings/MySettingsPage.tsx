"use client";

import type { ReactNode } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionMenu, useSectionChoice } from "@/components/ui/SectionMenu";
import { Loading } from "@/components/ui/Loading";
import { LABELS } from "@/constants/messages";
import {
  MY_SETTINGS_SECTIONS,
  MY_SETTINGS_TEXT,
  type MySettingsSection,
} from "@/constants/mySettings";
import { ROUTES } from "@/constants/routes";
import { PROGRESS_TEXT } from "@/constants/staffProgress";
import { SUPPORT_TEXT } from "@/constants/supportAccess";
import type { MyDetails } from "@/lib/api";

import { DevicesSection } from "./DevicesSection";
import { MyDetailsSection } from "./MyDetailsSection";
import { NotificationsSection } from "./NotificationsSection";
import { PasswordSection } from "./PasswordSection";
import { PreferencesSection } from "./PreferencesSection";
import { TwoFactorSection } from "./TwoFactorSection";
import { useMyDetails, type MyDetailsState } from "./useMyDetails";
import { WorkEmailSection } from "./WorkEmailSection";

/**
 * A person's own Settings (spec 22c-22g; issue 38): a menu on the left, one section at a time.
 * Every Role has it; office-wide settings are under Configuration.
 */
export function MySettingsPage() {
  const { supportAccess } = useCurrentStaff();
  return supportAccess === null ? <StaffSettings /> : <PlatformAdminSettings />;
}

/** A Platform Admin inside the office has no account here: who they are, and nothing to change. */
function PlatformAdminSettings() {
  const { staff } = useCurrentStaff();
  return (
    <div className="grid gap-8">
      <PageHeader title={MY_SETTINGS_TEXT.title} />
      <Panel>
        <div className="flex flex-wrap items-center gap-5 p-6">
          <span
            aria-hidden="true"
            className="rounded-pill bg-warn-tint text-warn grid size-16 flex-none place-items-center"
          >
            <Icon name="shield" size="lg" />
          </span>
          <div className="grid min-w-0 gap-2">
            <h2 className="text-section-title">{staff.name}</h2>
            <span>
              <Chip tone="accent" hasDot={false}>
                {LABELS.platformAdmin}
              </Chip>
            </span>
          </div>
        </div>
        <p className="border-rule text-ink-2 border-t p-6">{SUPPORT_TEXT.noAccountHere}</p>
      </Panel>
    </div>
  );
}

function StaffSettings() {
  const choice = useSectionChoice(MY_SETTINGS_SECTIONS[0]);
  const me = useMyDetails();
  const sections = MY_SETTINGS_SECTIONS.map((section) => ({
    id: section,
    title: MY_SETTINGS_TEXT.sections[section].title,
    description: MY_SETTINGS_TEXT.sections[section].help,
    content: body(section, me.state, me.show),
  }));

  return (
    <div className="grid gap-8">
      <SectionMenu
        label={MY_SETTINGS_TEXT.menu}
        backLabel={MY_SETTINGS_TEXT.backLabel}
        sections={sections}
        choice={choice}
        header={(back) => (
          <PageHeader
            title={MY_SETTINGS_TEXT.title}
            leading={back}
            actions={
              <ButtonLink href={ROUTES.myProgress} icon="chart">
                {PROGRESS_TEXT.myProgress}
              </ButtonLink>
            }
          />
        )}
      />
    </div>
  );
}

function body(
  section: MySettingsSection,
  state: MyDetailsState,
  show: (details: MyDetails) => void,
): ReactNode {
  if (section === "password") return <PasswordSection />;
  if (section === "devices") return <DevicesSection />;
  if (section === "twoFactor") return <TwoFactorSection />;
  if (section === "preferences") return <PreferencesSection />;
  return withDetails(state, (details) => {
    if (section === "workEmail") {
      return (
        <WorkEmailSection
          email={details.email}
          onChanged={(email) => {
            show({ ...details, email });
          }}
        />
      );
    }
    return section === "details" ? (
      <MyDetailsSection details={details} onSaved={show} />
    ) : (
      <NotificationsSection details={details} onSaved={show} />
    );
  });
}

function withDetails(state: MyDetailsState, render: (details: MyDetails) => ReactNode): ReactNode {
  if (state.status === "loaded") return render(state.details);
  if (state.status === "failed")
    return <Banner tone="problem">{MY_SETTINGS_TEXT.loadFailed}</Banner>;
  return (
    <Panel isPadded>
      <Loading />
    </Panel>
  );
}
