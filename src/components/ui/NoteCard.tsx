import clsx from "clsx";
import { useId, type ReactNode } from "react";

import { Icon } from "./Icon";

type NoteCardProps = {
  title: string;
  /** The Note's action, such as Edit, on the right of its head. */
  action?: ReactNode;
  /** The Note's text, or the form editing it. */
  children: ReactNode;
  /**
   * From 1280 it stands in a column of its own beside the work (a Student's page, UI revamp 11):
   * rounded like a sheet, its note line along the top instead of the left.
   */
  sitsBeside?: boolean;
};

const BESIDE =
  "desk:rounded-panel desk:border-l-0 desk:border-t-3 desk:px-gutter desk:pt-4.5 desk:pb-4";

/** A Student's Note, in the fixed note colour: at the top of the Student, or beside the work. */
export function NoteCard({ title, action, children, sitsBeside = false }: NoteCardProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={clsx(
        "border-note-rule bg-note rounded-r-control grid min-w-0 gap-2.5 border-l-3 px-4.5 py-3.5",
        sitsBeside && BESIDE,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id={titleId}
          className="text-body text-warn inline-flex items-center gap-2 font-semibold"
        >
          <Icon name="pin" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
