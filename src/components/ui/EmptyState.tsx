import type { ReactNode } from "react";

type EmptyStateProps = {
  /** What is missing. */
  children: ReactNode;
  /** The next thing to do about it. */
  action?: ReactNode;
};

export function EmptyState({ children, action }: EmptyStateProps) {
  return (
    <div className="text-ink-2 px-gutter grid justify-items-center gap-4 py-12 text-center">
      <p>{children}</p>
      {action}
    </div>
  );
}
