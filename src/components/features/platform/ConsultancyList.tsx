"use client";

import { useState } from "react";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/useToast";
import { OpenOfficeDialog } from "@/components/features/supportAccess/OpenOfficeDialog";
import { SupportVisitList } from "@/components/features/supportAccess/SupportVisitList";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { ADMIN_TEXT, SETUP_TEXT } from "@/constants/consultancyStatus";
import {
  retryConsultancySetup,
  updateModules,
  type ConsultancyOverview,
  updatingOr,
} from "@/lib/api";

import { ChangeStatusDialog } from "./ChangeStatusDialog";
import { ConfigurationDialog } from "./ConfigurationDialog";
import { ConsultancyListContent } from "./ConsultancyListContent";
import { useConsultancies } from "./useConsultancies";

/**
 * The Platform's list of every Consultancy: create one; change its Features and Admins
 * (issue 64) in its Configuration (ticket 16); change its Status; open it as Platform Admin
 * (issue 27), or set it up again if its setup failed (issue 60); then every Platform Admin visit.
 */
export function ConsultancyList() {
  const { list, replace } = useConsultancies();
  const { showToast } = useToast();
  const [configuring, setConfiguring] = useState<ConsultancyOverview | null>(null);
  const [statusFor, setStatusFor] = useState<ConsultancyOverview | null>(null);
  const [officeToOpen, setOfficeToOpen] = useState<ConsultancyOverview | null>(null);

  async function tryAgain(consultancy: ConsultancyOverview): Promise<void> {
    try {
      const updated = await retryConsultancySetup(consultancy.id);
      showToast(SETUP_TEXT.setupStartedAgain(updated.name));
      replace(updated);
    } catch (error) {
      showToast(updatingOr(error, SETUP_TEXT.tryAgainFailed));
    }
  }

  return (
    <>
      <PageHeader
        title={LABELS.consultancies}
        subtitle={MESSAGES.consultanciesIntro}
        actions={
          <ButtonLink href={ROUTES.platformNewConsultancy} variant="primary" icon="plus">
            {LABELS.newConsultancy}
          </ButtonLink>
        }
      />
      <ConsultancyListContent
        list={list}
        onChangeStatus={setStatusFor}
        onConfigure={setConfiguring}
        onOpenOffice={setOfficeToOpen}
        onTryAgain={tryAgain}
      />
      <SupportVisitList />
      {configuring !== null && (
        <ConfigurationDialog
          consultancy={configuring}
          onClose={() => {
            setConfiguring(null);
          }}
          onSaveFeatures={async (switches) => {
            const updated = await updateModules(configuring.id, switches);
            showToast(MESSAGES.featuresSaved(updated.name));
            replace(updated);
          }}
          onAdminAdded={(name) => {
            showToast(ADMIN_TEXT.inviteSent(name));
          }}
        />
      )}
      {officeToOpen !== null && (
        <OpenOfficeDialog
          office={officeToOpen}
          onClose={() => {
            setOfficeToOpen(null);
          }}
        />
      )}
      {statusFor !== null && (
        <ChangeStatusDialog
          consultancy={statusFor}
          onClose={() => {
            setStatusFor(null);
          }}
          onSaved={(updated) => {
            replace(updated);
            setStatusFor(null);
          }}
        />
      )}
    </>
  );
}
