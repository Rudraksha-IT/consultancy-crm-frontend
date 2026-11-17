import type { ReactNode } from "react";

type EmailShownAboveProps = {
  /** e.g. "Logging in as" or "Joining as". */
  label: string;
  email: string;
  /** A way back to type another email. */
  action: ReactNode;
};

/** After the email step (issue 66): the email as text above the one box still asked for. */
export function EmailShownAbove({ label, email, action }: EmailShownAboveProps) {
  return (
    <div className="bg-fill rounded-control flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2">
      <span className="grid min-w-0 leading-5">
        <span className="text-small text-ink-2">{label}</span>
        <b className="text-ink break-all">{email}</b>
      </span>
      {action}
    </div>
  );
}
