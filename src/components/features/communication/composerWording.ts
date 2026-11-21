import { COMMUNICATION_TEXT as TEXT } from "@/constants/communication";

import { firstNameOf, type EmailRecipient } from "./recipients";

/** The words that differ between one Student's email and one to many. */
export type ComposerWording = {
  title: string;
  /** The line beside the buttons. */
  footerLine: string;
  sendLabel: string;
  hint: string;
  /** In the preview: who it goes to, and whose copy it is. */
  toLine: string;
  whose: string;
  /** "Dear Sita," for one; "Dear Student," (null) for many. */
  greetingName: string | null;
};

/** The composer's words for one Student (`only`) or for many `recipients`. */
export function composerWording(
  only: EmailRecipient | null,
  recipients: readonly EmailRecipient[],
  office: string,
): ComposerWording {
  if (only === null) {
    return {
      title: TEXT.emailManyStudents,
      footerLine: TEXT.eachOwnCopy(recipients.length),
      sendLabel: TEXT.sendTo(recipients.length),
      hint: TEXT.manyHint,
      toLine: TEXT.toEachStudent,
      whose: TEXT.eachStudent,
      greetingName: null,
    };
  }
  return {
    title: TEXT.newEmail,
    footerLine: TEXT.sentAs(office),
    sendLabel: TEXT.send,
    hint: TEXT.oneHint,
    toLine: TEXT.toName(only.name),
    whose: firstNameOf(only.name),
    greetingName: firstNameOf(only.name),
  };
}
