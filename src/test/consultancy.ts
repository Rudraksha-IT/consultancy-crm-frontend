import { ConsultancyStatus } from "@/constants/consultancyStatus";

/** The context's Consultancy for an Active office with no logo, in frontend naming. */
export function consultancySummary(name = "Acme Education") {
  return {
    name,
    logo: null,
    status: ConsultancyStatus.Active,
    statusMessage: null,
    evaluationEndsAt: null,
  };
}
