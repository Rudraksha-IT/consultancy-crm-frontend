import type { ChipTone } from "@/components/ui/Chip";
import type { TransferRequestStatus } from "@/constants/transferRequests";

/** Each status's fixed colour; the word is always shown with it. */
export const STATUS_TONES: Record<TransferRequestStatus, ChipTone> = {
  waiting: "warn",
  approved: "good",
  declined: "bad",
  cancelled: "muted",
  closed: "muted",
};
