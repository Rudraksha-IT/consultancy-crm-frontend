import { useId, type ReactNode } from "react";

import { Icon } from "./Icon";

type NoteCardProps = {
  title: string;
  /** The Note's action, such as Edit, on the right of its head. */
  action?: ReactNode;
  /** The Note's text, or the form editing it. */
  children: ReactNode;
};

/** A Student's Note, in the fixed note colour, always at the top of the Student. */
export function NoteCard({ title, action, children }: NoteCardProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="border-note-rule bg-note rounded-r-control grid gap-2.5 border-l-3 px-4.5 py-3.5"
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
