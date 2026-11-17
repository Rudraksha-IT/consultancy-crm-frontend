"use client";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { PlatformControls } from "@/components/features/supportAccess/PlatformControls";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SectionParts } from "@/components/ui/Section";
import { SectionMenu, useSectionChoice, type MenuSection } from "@/components/ui/SectionMenu";
import { COMMUNICATION_TEXT } from "@/constants/communication";
import { CONFIGURATION_SECTIONS_TEXT as TEXT } from "@/constants/configuration";
import { EXPORT_TEXT } from "@/constants/exports";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { SUPPORT_TEXT } from "@/constants/supportAccess";

import { DatesSettings } from "./DatesSettings";
import { DocumentsSettings } from "./DocumentsSettings";
import { ExportsSettings } from "./ExportsSettings";
import { OfficeNetworkSettings } from "./OfficeNetworkSettings";
import { OfficeLogoSettings } from "./OfficeLogoSettings";
import { SmsEmailSettings } from "./SmsEmailSettings";
import { HolidaySettings } from "./HolidaySettings";
import { WorkingDaySettings } from "./WorkingDaySettings";

/**
 * The Consultancy's own settings, for Admins only, one section at a time (issue 96): General
 * (Office logo, Dates), Documents, Email and SMS while the Communication
 * Module is on, Working hours while Clock-in is on, and Exports. A Platform Admin inside the
 * office also has the Platform controls, last (issue 27).
 */
export function ConfigurationPage() {
  const { staff, modules, supportAccess } = useCurrentStaff();
  const choice = useSectionChoice("general");

  if (staff.role !== Role.Admin) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }

  const sections: MenuSection[] = [
    {
      id: "general",
      ...TEXT.general,
      content: (
        <SectionParts>
          <OfficeLogoSettings />
          <DatesSettings />
        </SectionParts>
      ),
    },
    {
      id: "documents",
      ...TEXT.documents,
      content: <DocumentsSettings />,
    },
  ];
  if (modules.includes(Module.Communication)) {
    sections.push({
      id: "emailAndSms",
      title: COMMUNICATION_TEXT.emailAndSms,
      hasOwnTitle: true,
      content: <SmsEmailSettings />,
    });
  }
  if (modules.includes(Module.ClockIn)) {
    sections.push({ id: "workingHours", ...TEXT.workingHours, content: <ClockInSettings /> });
  }
  sections.push({
    id: "exports",
    title: EXPORT_TEXT.exports,
    hasOwnTitle: true,
    content: <ExportsSettings />,
  });
  if (supportAccess !== null) {
    sections.push({
      id: "platformControls",
      title: SUPPORT_TEXT.controlsTitle,
      hasOwnTitle: true,
      content: <PlatformControls />,
    });
  }

  return (
    <div className="grid gap-8">
      <PageHeader title={LABELS.configuration} subtitle={MESSAGES.configurationIntro} />
      <SectionMenu
        label={LABELS.configuration}
        backLabel={TEXT.backLabel}
        sections={sections}
        choice={choice}
      />
    </div>
  );
}

/**
 * The Clock-in Module's settings, under Working hours: the Working Day, the holidays (asked
 * 2026-11-16), then the Office network (issues 55, 56).
 */
function ClockInSettings() {
  return (
    <SectionParts>
      <WorkingDaySettings />
      <HolidaySettings />
      <OfficeNetworkSettings />
    </SectionParts>
  );
}
