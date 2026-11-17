import type { ChipTone } from "@/components/ui/Chip";
import type { VisaStatus } from "@/constants/visas";

/** Status colours are fixed; the word is always shown with them. */
export const VISA_STATUS_TONES: Record<VisaStatus, ChipTone> = {
  applied: "accent",
  granted: "good",
  refused: "bad",
};
