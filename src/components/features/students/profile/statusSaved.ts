import { APPLICATION_TEXT } from "@/constants/applications";
import { STAGE_LABELS, Stage } from "@/constants/stages";
import { InvalidFieldsError } from "@/lib/api";

import { saveFailure } from "./saveErrors";

/**
 * The toast after an Application or Visa Status change: what was saved, then where the Stage went
 * (or that a Lost Student stayed Lost).
 */
export function statusSavedMessage(saved: string, before: Stage, after: Stage): string {
  if (after !== before) return `${saved}. ${APPLICATION_TEXT.stageMoved(STAGE_LABELS[after])}.`;
  if (after === Stage.Lost) return `${saved}. ${APPLICATION_TEXT.stayedLost}`;
  return saved;
}

/** Why a Status change or a new Visa wasn't saved: the API's own reason when it gave one. */
export function changeFailure(error: unknown): string {
  if (error instanceof InvalidFieldsError) {
    const [first] = Object.values<string[] | undefined>(error.fieldErrors).flat();
    if (first !== undefined) return first;
  }
  return saveFailure(error);
}
