import type { ChipTone } from "@/components/ui/Chip";
import type { ApplicationStatus } from "@/constants/applications";

/** Status colours are fixed; the word is always shown with them. */
export const APPLICATION_STATUS_TONES: Record<ApplicationStatus, ChipTone> = {
  applied: "accent",
  offer: "good",
  rejected: "bad",
};
