"use client";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";

/**
 * Says the office's contact email must be set before any email can go to Students, because their
 * replies go there (ADR 0023). An Admin gets a link to Office details; nothing shows once it's set.
 */
export function ContactEmailBanner() {
  const { staff, consultancy } = useCurrentStaff();
  if (consultancy.hasContactEmail) return null;
  if (staff.role !== Role.Admin) return <Banner tone="warning">{TEXT.noContactStaff}</Banner>;
  return (
    <Banner
      tone="warning"
      action={
        <ButtonLink href={ROUTES.configuration} size="sm">
          {TEXT.openOfficeDetails}
        </ButtonLink>
      }
    >
      {TEXT.noContactAdmin}
    </Banner>
  );
}
