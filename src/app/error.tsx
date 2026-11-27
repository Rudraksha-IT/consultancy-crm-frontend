"use client";

import { FailedScreen } from "@/components/features/errors/FailedScreen";

type ErrorPageProps = {
  /** `digest` is Next.js's reference for a server error; the server log has the same one. */
  error: Error & { digest?: string };
  reset: () => void;
};

/** A screen failed: the general error page, with the reference staff can quote (issue 58). */
export default function ErrorPage({ error }: ErrorPageProps) {
  return <FailedScreen reference={error.digest} />;
}
