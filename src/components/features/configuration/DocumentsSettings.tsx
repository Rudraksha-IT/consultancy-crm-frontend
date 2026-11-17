"use client";

import { useState } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DOCUMENT_TEXT, DOCUMENTS_PARTS_TEXT, DocumentsPart } from "@/constants/documents";

import { CountryDocumentLists } from "./CountryDocumentLists";
import { DocumentTypesSettings } from "./DocumentTypesSettings";

const PARTS = Object.values(DocumentsPart);

/**
 * Configuration → Documents (issue 97; prototype `sec=1&cpart=N`): three tabs, Always needed,
 * Extra documents and By country, one shown at a time. Each part loads when it is shown, so a
 * document made from a Country's list is under Extra documents when that tab is opened.
 */
export function DocumentsSettings() {
  const [part, setPart] = useState<DocumentsPart>(DocumentsPart.Always);
  const { tab, help } = DOCUMENTS_PARTS_TEXT[part];
  return (
    <div className="grid min-w-0 gap-4">
      <SegmentedControl
        label={DOCUMENT_TEXT.partsLabel}
        value={part}
        onChange={setPart}
        options={PARTS.map((one) => ({ value: one, label: DOCUMENTS_PARTS_TEXT[one].tab }))}
      />
      <section aria-label={tab} className="grid min-w-0 content-start gap-4">
        <p className="text-small text-ink-2">{help}</p>
        {part === DocumentsPart.ByCountry ? (
          <CountryDocumentLists />
        ) : (
          <DocumentTypesSettings key={part} part={part} />
        )}
      </section>
    </div>
  );
}
