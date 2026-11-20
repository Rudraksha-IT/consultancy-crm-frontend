"use client";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { BATCH_TEXT } from "@/constants/batches";
import { ROUTES } from "@/constants/routes";
import { parseRecordNumber as parseId } from "@/lib/recordId";

import { BatchPage } from "./BatchPage";

/** The class page for the id in the address; an address that isn't an id finds no class. */
export function BatchRoute({ idText }: { idText: string }) {
  const batchId = parseId(idText);
  if (batchId === null) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.batches}>{BATCH_TEXT.allClasses}</ButtonLink>}>
          {BATCH_TEXT.notFound}
        </EmptyState>
      </Panel>
    );
  }
  return <BatchPage key={batchId} batchId={batchId} />;
}
