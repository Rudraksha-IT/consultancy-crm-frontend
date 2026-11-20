import { uid } from "@/test/ids";
import { on, type Answer } from "./backend";

const UNUSED = { fees: 0, payments: 0 };

/** The seven Fee Types a new office starts with (issue 06), as the API lists them. */
export const FEE_TYPES = [
  { id: uid(1), name: "Application fee", hidden: false, other: false, uses: UNUSED },
  { id: uid(2), name: "College / tuition fee", hidden: false, other: false, uses: UNUSED },
  { id: uid(3), name: "Visa fee", hidden: false, other: false, uses: UNUSED },
  { id: uid(4), name: "IELTS class", hidden: false, other: false, uses: UNUSED },
  { id: uid(5), name: "PTE class", hidden: true, other: false, uses: UNUSED },
  { id: uid(6), name: "Documentation / other services", hidden: false, other: false, uses: UNUSED },
  { id: uid(7), name: "Other", hidden: false, other: true, uses: UNUSED },
] as const;

/** The answer to the Fee Types list, for any form that picks one. PTE class is hidden. */
export const onFeeTypes: Answer = on("GET", "/api/fee-types/", { results: FEE_TYPES });

/** A Fee Type as a Fee or Payment answer names it. */
export function feeTypeRef(id: (typeof FEE_TYPES)[number]["id"]) {
  const found = FEE_TYPES.find((type) => type.id === id);
  if (found === undefined) throw new Error(`No Fee Type ${id}`);
  return { id: found.id, name: found.name };
}
