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
  updateConsultancyTheme,
  updateModules,
  type ConsultancyOverview,
} from "@/lib/api";

import { AddAdminDialog } from "./AddAdminDialog";
import { ChangeStatusDialog } from "./ChangeStatusDialog";
import { ColoursDialog } from "./ColoursDialog";
import { ConsultancyListContent } from "./ConsultancyListContent";
import { FeaturesDialog } from "./FeaturesDialog";
import { useConsultancies } from "./useConsultancies";

/**
 * The Platform's list of every Consultancy: create one, add its Admins (issue 64), change its
 * features, colours or Status,
 * open it as Platform Admin (issue 27), or set it up again if its setup failed (issue 60); then
 * every Platform Admin visit.
 */
export function ConsultancyList() {
  const { list, replace } = useConsultancies();
  const { showToast } = useToast();
  const [featuresFor, setFeaturesFor] = useState<ConsultancyOverview | null>(null);
  const [statusFor, setStatusFor] = useState<ConsultancyOverview | null>(null);
  const [coloursFor, setColoursFor] = useState<ConsultancyOverview | null>(null);
  const [officeToOpen, setOfficeToOpen] = useState<ConsultancyOverview | null>(null);
  const [adminFor, setAdminFor] = useState<ConsultancyOverview | null>(null);

  async function tryAgain(consultancy: ConsultancyOverview): Promise<void> {
    try {
      const updated = await retryConsultancySetup(consultancy.id);
      showToast(SETUP_TEXT.setupStartedAgain(updated.name));
      replace(updated);
    } catch {
      showToast(SETUP_TEXT.tryAgainFailed);
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
        onOpenFeatures={setFeaturesFor}
        onOpenOffice={setOfficeToOpen}
        onChooseColours={setColoursFor}
        onAddAdmin={setAdminFor}
        onTryAgain={tryAgain}
      />
      <SupportVisitList />
      {featuresFor !== null && (
        <FeaturesDialog
          office={featuresFor}
          onClose={() => {
            setFeaturesFor(null);
          }}
          onSave={async (switches) => {
            const updated = await updateModules(featuresFor.id, switches);
            showToast(MESSAGES.featuresSaved(updated.name));
            replace(updated);
            setFeaturesFor(null);
          }}
        />
      )}
      {coloursFor !== null && (
        <ColoursDialog
          consultancy={coloursFor}
          onClose={() => {
            setColoursFor(null);
          }}
          onSave={async (theme) => {
            const updated = await updateConsultancyTheme(coloursFor.id, theme);
            showToast(MESSAGES.coloursSaved(updated.name));
            replace(updated);
            setColoursFor(null);
          }}
        />
      )}
      <AddAdminDialog
        office={adminFor}
        onClose={() => {
          setAdminFor(null);
        }}
        onAdded={(name) => {
          showToast(ADMIN_TEXT.inviteSent(name));
          setAdminFor(null);
        }}
      />
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
