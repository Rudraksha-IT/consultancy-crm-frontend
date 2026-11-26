import clsx from "clsx";

import { Icon, type IconName } from "@/components/ui/Icon";
import {
  DOCUMENT_TEXT,
  PAPERWORK_KEY_ORDER,
  PAPERWORK_STATE_TEXT,
  type PaperworkItemState,
} from "@/constants/documents";

/**
 * Each state's own colour and line icon, so the colour never stands alone: green tick (checked),
 * amber clock (received, waiting), red cross with a red outline (rejected), a dashed grey outline
 * with a plus (not received).
 */
const LOOK: Record<PaperworkItemState, { icon: IconName; classes: string }> = {
  verified: { icon: "check", classes: "bg-good-tint text-good border-transparent font-medium" },
  waiting: { icon: "clock", classes: "bg-warn-tint text-warn border-transparent font-medium" },
  rejected: { icon: "x", classes: "bg-bad-tint text-bad border-bad/35 font-semibold" },
  missing: { icon: "plus", classes: "text-ink-2 border-rule-2 border-dashed font-medium" },
};

type DocumentPillProps = {
  state: PaperworkItemState;
  /** The words on the pill: a document's name, or the state's word in the key. */
  children: string;
  /** What screen readers hear after the words. */
  says: string;
  /** The whole phrase on hover, for a name cut with "…". */
  title?: string;
};

/**
 * One checklist document on the Documents page (UI revamp 12): its name on a pill coloured by
 * where it stands. A list item: use inside a `<ul>`.
 */
export function DocumentPill({ state, children, says, title }: DocumentPillProps) {
  const { icon, classes } = LOOK[state];
  return (
    <li
      data-state={state}
      title={title}
      className={clsx(
        "text-small rounded-pill inline-flex min-h-7 max-w-full items-center gap-1.25 border py-0.5 pr-2.5 pl-2 whitespace-nowrap",
        classes,
      )}
    >
      <Icon name={icon} size="sm" />
      <span className="min-w-0 truncate">{children}</span>
      <span className="sr-only">{says}</span>
    </li>
  );
}

/** What the four colours mean, above the list at its right. Not on phones, which show no pills. */
export function DocumentPillKey() {
  return (
    <ul
      aria-label={DOCUMENT_TEXT.pillKey}
      className="max-phone:hidden -my-3 flex min-w-0 flex-wrap justify-end gap-1.5"
    >
      {PAPERWORK_KEY_ORDER.map((state) => (
        <DocumentPill key={state} state={state} says={`: ${PAPERWORK_STATE_TEXT[state].says}`}>
          {PAPERWORK_STATE_TEXT[state].word}
        </DocumentPill>
      ))}
    </ul>
  );
}
