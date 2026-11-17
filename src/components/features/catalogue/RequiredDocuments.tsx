import { Banner } from "@/components/ui/Banner";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { MESSAGES } from "@/constants/messages";

import type { OptionalTypesState } from "./useOptionalDocumentTypes";

type RequiredDocumentsProps = {
  /** Keeps tick boxes of several Courses on one page apart. */
  name: string;
  types: OptionalTypesState;
  /** The ticked Document Type ids. */
  ticked: readonly number[];
  onChange: (ids: number[]) => void;
  errors?: readonly string[] | undefined;
};

/** A Course's Required documents as tick boxes, never free text (issue 92). */
export function RequiredDocuments({
  name,
  types,
  ticked,
  onChange,
  errors,
}: RequiredDocumentsProps) {
  if (types.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (types.status === "failed") return <Banner tone="problem">{DOCUMENT_TEXT.typesFailed}</Banner>;
  return (
    <CheckboxGroup
      label={CATALOGUE_TEXT.requiredDocuments}
      name={name}
      hint={CATALOGUE_TEXT.requiredDocumentsHint}
      options={types.types.map((type) => ({ value: String(type.id), label: type.name }))}
      values={ticked.map(String)}
      onChange={(values) => {
        onChange(values.map(Number));
      }}
      isOptional
      errors={errors}
    />
  );
}
