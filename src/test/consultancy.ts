import { ConsultancyStatus } from "@/constants/consultancyStatus";
import { NO_OFFICE_DETAILS } from "@/lib/api";

/** The context's Consultancy for an Active office with no logo, in frontend naming. */
export function consultancySummary(name = "Acme Education") {
  return {
    name,
    logo: null,
    status: ConsultancyStatus.Active,
    statusMessage: null,
    evaluationEndsAt: null,
    officeDetails: NO_OFFICE_DETAILS,
    hasContactEmail: false,
  };
}
