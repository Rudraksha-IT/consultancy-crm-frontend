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
      className="rounded-panel border-note-rule bg-note grid gap-2.5 border px-6 py-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-body text-warn inline-flex items-center gap-2 font-bold">
          <Icon name="pin" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
