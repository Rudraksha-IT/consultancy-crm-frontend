import type { RecordId } from "@/lib/recordId";

/**
 * A fixed, readable record UUID for tests (ADR 0027): `uid(7)` is
 * "00000000-0000-4000-8000-000000000007". The same number always gives the same UUID.
 */
export function uid(n: number): RecordId {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}
