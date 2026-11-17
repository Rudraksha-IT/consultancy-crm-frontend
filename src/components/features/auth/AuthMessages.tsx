type AuthMessagesProps = { error: string | null; notice: string | null };

/** A step's problem (announced as an alert) or good news (a status), under its form. */
export function AuthMessages({ error, notice }: AuthMessagesProps) {
  return (
    <>
      {error !== null && (
        <p role="alert" className="text-bad font-semibold">
          {error}
        </p>
      )}
      {notice !== null && (
        <p role="status" className="text-good">
          {notice}
        </p>
      )}
    </>
  );
}
