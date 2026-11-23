import type { RecordId } from "@/lib/recordId";

import { Banner } from "@/components/ui/Banner";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { Loading } from "@/components/ui/Loading";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { DOCUMENT_TEXT } from "@/constants/documents";

import type { OptionalTypesState } from "./useOptionalDocumentTypes";

type RequiredDocumentsProps = {
  /** Keeps tick boxes of several Courses on one page apart. */
  name: string;
  types: OptionalTypesState;
  /** The ticked Document Type ids. */
  ticked: readonly RecordId[];
  onChange: (ids: RecordId[]) => void;
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
  if (types.status === "loading") return <Loading />;
  if (types.status === "failed") return <Banner tone="problem">{DOCUMENT_TEXT.typesFailed}</Banner>;
  return (
    <CheckboxGroup
      label={CATALOGUE_TEXT.requiredDocuments}
      name={name}
      hint={CATALOGUE_TEXT.requiredDocumentsHint}
      options={types.types.map((type) => ({ value: type.id, label: type.name }))}
      values={ticked.map(String)}
      onChange={(values) => {
        onChange(values);
      }}
      isOptional
      errors={errors}
    />
  );
}
