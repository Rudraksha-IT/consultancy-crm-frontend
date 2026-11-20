import type { RecordId } from "@/lib/recordId";

import { uid } from "./ids";

/** One file of a Document as the API answers it (issue 78). */
type ApiFile = {
  id: RecordId;
  file_name: string;
  content_type: string;
  size: number;
  uploaded_at: string;
  uploaded_by: { id: number; name: string } | null;
};

/** A file as the API answers it, named `name`, for tests. */
export function apiFile(id: number, name: string): ApiFile {
  return {
    id: uid(id),
    file_name: name,
    content_type: name.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
    size: 2048,
    uploaded_at: "2026-11-01T10:00:00+05:45",
    uploaded_by: { id: 5, name: "Bikash Thapa" },
  };
}

/** A Document as the API answers it. */
type ApiDocument = {
  id: RecordId;
  files: ApiFile[];
  verification: string;
  rejection_reason: string;
  link: { kind: string; id: RecordId; university: string } | null;
  /** Its files in the Bin (issue 79); none unless a test says so. */
  binned_files?: { id: RecordId; file_name: string; bin: unknown }[];
  uploaded_at: string;
  uploaded_by: { id: number; name: string } | null;
};

/** Documents as the API answers them, for tests. */
export const PASSPORT_DOCUMENT: ApiDocument = {
  id: uid(31),
  files: [apiFile(41, "passport.pdf")],
  verification: "pending",
  rejection_reason: "",
  link: null,
  uploaded_at: "2026-11-01T10:00:00+05:45",
  uploaded_by: { id: 5, name: "Bikash Thapa" },
};

type Item = {
  id: number;
  name: string;
  state: string;
  reason?: string;
  isRequired?: boolean;
  addedForStudent?: boolean;
  /** Applying unless said; always null for one not required ("Other documents", issue 80). */
  group?: "applying" | "visa" | "statements";
  document?: typeof PASSPORT_DOCUMENT | null;
};

const ITEM_DEFAULTS = {
  reason: "",
  isRequired: true,
  addedForStudent: false,
  group: "applying",
  document: null,
} as const;

export function item(given: Item) {
  const one = { ...ITEM_DEFAULTS, ...given };
  return {
    document_type: { id: one.id, name: one.name },
    reason: one.reason,
    is_required: one.isRequired,
    added_for_student: one.addedForStudent,
    group: one.isRequired ? one.group : null,
    state: one.state,
    document: one.document,
  };
}

const NOT_ASKED: number[] = [];

export const CHECKLIST = {
  done: 2,
  total: 4,
  can_change: true,
  asked: NOT_ASKED,
  items: [
    item({ id: 1, name: "Passport", state: "waiting", document: PASSPORT_DOCUMENT }),
    item({
      id: 2,
      name: "Citizenship",
      state: "verified",
      document: {
        ...PASSPORT_DOCUMENT,
        id: uid(32),
        files: [apiFile(42, "citizenship.jpg")],
        verification: "verified",
        link: { kind: "application", id: uid(11), university: "Federation University" },
      },
    }),
    item({
      id: 3,
      name: "SEE Marksheet",
      state: "rejected",
      document: {
        ...PASSPORT_DOCUMENT,
        id: uid(33),
        files: [apiFile(43, "see.pdf")],
        verification: "rejected",
        rejection_reason: "Photo is blurred.",
      },
    }),
    item({ id: 4, name: "Bank Statement", state: "not_received", group: "visa" }),
  ],
};

/** The checklist's lists: one per Document Group, then Other documents (issue 80). */
const CHECKLIST_LISTS = ["Applying", "Visa", "Statements", "Other documents"];

/** The checklist row (in any group) whose text includes `name`. */
export function checklistRow(
  within: (element: HTMLElement) => { queryByText: (text: string, options?: object) => unknown },
  lists: HTMLElement[],
  name: string,
  options?: object,
): HTMLElement {
  for (const list of lists) {
    if (!CHECKLIST_LISTS.includes(list.getAttribute("aria-label") ?? "")) continue;
    const row = [...list.querySelectorAll(":scope > li")].find(
      (li) => li instanceof HTMLElement && within(li).queryByText(name, options) !== null,
    );
    if (row instanceof HTMLElement) return row;
  }
  throw new Error(`No row for ${name}`);
}
